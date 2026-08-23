import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { usePolling } from "@/hooks/usePolling";
import { getKitchenQueue, type KitchenQueue } from "@/services/laborService";

/**
 * Live kitchen wait, and the arithmetic that turns it into "when will this
 * dish be out?".
 *
 * ── The formula, and why it mixes max and sum ─────────────────────────────
 * The captain's question is "if I add this now, when does THIS table eat?",
 * so every figure below is marginal — the wait a NEW dish joins, not the
 * kitchen's total workload.
 *
 *     eta(dish) = max over s ( queueWait(s) + cartAhead(s) )   ← waiting
 *               + sum over s ( ownMinutes(dish, s) )           ← cooking
 *
 * The two halves genuinely behave differently, and using one rule for both
 * gets it badly wrong:
 *
 *   WAITING is a max. The dish can't start until the most backed-up station
 *   it needs frees up, but those stations drain in parallel — summing their
 *   queues would count the same wall-clock minutes several times over.
 *
 *   COOKING is a sum. For one dish its own stations are SEQUENTIAL: it's
 *   prepped, then cooked, then plated. An earlier version took the max here
 *   too, which quoted a 20-minute dosa at 10 minutes on an empty kitchen —
 *   under-promising by half, the precise failure this feature exists to
 *   avoid. Caught by checking quotes against each dish's known prepTime.
 *
 * Cooking time is also FLOORED at the dish's own prepTime. Station splits are
 * routinely incomplete — on live data they cover 3 of 10 stations and sum to
 * ~58% of prepTime on average — so the sum alone under-promises by a wide
 * margin. Falling back to the whole-dish time the kitchen already knows means
 * a partly-mapped dish is quoted honestly, while a fully-mapped one gets the
 * sharper station-aware figure. It self-corrects as standards are filled in,
 * with no data migration.
 *
 * That gives a clean sanity anchor: with nothing cooking, a dish quotes at
 * least its known prepTime, never less.
 *
 * `cartAhead` IS divided by productiveDivisor (lanes × utilization) because
 * that work is absorbed by the crew just like the existing backlog. A dish's
 * own cooking time is NOT divided: two cooks on the tandoor doesn't cook one
 * naan twice as fast.
 *
 * ── Honesty ───────────────────────────────────────────────────────────────
 * A captain quotes this to a customer, so a wrong number is worse than none.
 * `estimate()` returns null — and the UI shows nothing — whenever the branch
 * has no stations/standards configured, or this particular dish has no labor
 * standard. It never falls back to a guess.
 */

export interface DishEstimate {
  /** Total minutes until this dish is out, queue included. */
  minutes: number;
  /** Minutes of that which is purely waiting behind existing orders. */
  queueMinutes: number;
  /** Name of the station that governs the wait. */
  bindingStation: string;
  /** True when equipment throughput, not staffing, is the constraint there. */
  equipmentBound: boolean;
}

export interface CartLine {
  menuItemId: number;
  qty: number;
}

export function useKitchenQueue() {
  const { user } = useAppSelector((s) => s.auth);
  const [queue, setQueue] = useState<KitchenQueue | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchQueue = useCallback(async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    try {
      const res = await getKitchenQueue(user.restaurantId, user.branchId);
      if (res.success) setQueue(res.data);
    } catch {
      // Silent: the ETA is advisory. A failed poll must never interrupt order
      // taking — the badges simply stop appearing.
    } finally {
      setLoaded(true);
    }
  }, [user?.restaurantId, user?.branchId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);
  // Same 30s cadence the KDS and the ready-order bell already use.
  usePolling(fetchQueue, 30000, [fetchQueue]);

  const stationById = useMemo(() => {
    const m = new Map<number, KitchenQueue["stations"][number]>();
    queue?.stations.forEach((s) => m.set(s.stationId, s));
    return m;
  }, [queue]);

  /**
   * Estimate for one dish added on top of the current queue AND anything
   * already in the cart (`alsoPending`), since those tickets go to the kitchen
   * together and compete for the same stations.
   */
  const estimate = useCallback(
    (menuItemId: number, qty = 1, alsoPending: CartLine[] = []): DishEstimate | null => {
      if (!queue?.configured) return null;
      const own = queue.standards[menuItemId];
      if (!own?.length) return null;

      // Hands-on minutes the rest of the cart adds at each station — this dish
      // queues behind those too.
      const pendingByStation = new Map<number, number>();
      alsoPending.forEach((line) => {
        if (line.menuItemId === menuItemId) return;
        (queue.standards[line.menuItemId] || []).forEach((s) => {
          pendingByStation.set(
            s.stationId,
            (pendingByStation.get(s.stationId) ?? 0) + s.minutes * line.qty,
          );
        });
      });

      // WAIT — the worst single station this dish has to get into.
      let worstWait = 0;
      let bindingStation = "";
      let equipmentBound = false;
      // COOK — this dish's own stations run one after another for it.
      let ownMinutes = 0;

      for (const { stationId, minutes } of own) {
        const st = stationById.get(stationId);
        if (!st) continue;
        const divisor = st.productiveDivisor > 0 ? st.productiveDivisor : 1;
        const wait = st.waitMinutes + (pendingByStation.get(stationId) ?? 0) / divisor;
        if (wait > worstWait || !bindingStation) {
          worstWait = Math.max(worstWait, wait);
          bindingStation = st.name;
          equipmentBound = st.isEquipmentBound;
        }
        ownMinutes += minutes * qty;
      }
      if (!bindingStation) return null;

      // Never quote less than the dish's own known prep time (scaled by qty).
      const wholeDish = (queue.wholeItemMinutes?.[menuItemId] ?? 0) * qty;
      const cookMinutes = Math.max(ownMinutes, wholeDish);

      return {
        minutes: Math.max(1, Math.round(worstWait + cookMinutes)),
        queueMinutes: Math.round(worstWait),
        bindingStation,
        equipmentBound,
      };
    },
    [queue, stationById],
  );

  /** Estimate for a whole cart — the last dish out is when the table eats. */
  const estimateOrder = useCallback(
    (lines: CartLine[]): { estimate: DishEstimate | null; unpricedItems: number } => {
      if (!queue?.configured) return { estimate: null, unpricedItems: 0 };
      let worst: DishEstimate | null = null;
      let unpriced = 0;
      lines.forEach((line) => {
        const e = estimate(line.menuItemId, line.qty, lines);
        if (!e) {
          unpriced += 1;
          return;
        }
        if (!worst || e.minutes > worst.minutes) worst = e;
      });
      return { estimate: worst, unpricedItems: unpriced };
    },
    [queue, estimate],
  );

  return {
    queue,
    loaded,
    /** True only when the branch is set up well enough to quote anything. */
    configured: !!queue?.configured,
    reason: queue?.reason,
    /** False when nobody is clocked in, so every station assumed a single lane. */
    staffDataAvailable: queue?.staffDataAvailable ?? false,
    targetTicketMinutes: queue?.targetTicketMinutes ?? 30,
    estimate,
    estimateOrder,
    refresh: fetchQueue,
  };
}
