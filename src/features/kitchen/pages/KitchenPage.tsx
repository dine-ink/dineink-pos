import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  getAllRunningOrders,
  updateRunningOrderStatus,
  approveItemCancel,
  rejectItemCancel,
  toggleItemDone,
  holdRunningOrder,
  resumeRunningOrder,
} from "@/services/runningOrderService";
import { getBranchDetails } from "@/services/branchService";
import { setMenuItemAvailability } from "@/services/menuService";
import { api } from "@/services/api";
import { usePolling } from "@/hooks/usePolling";
import { ChefHat, RefreshCw, Clock, UtensilsCrossed, Layers, Ban, Search, AlertTriangle } from "lucide-react";
import PageLoader from "@/components/ui/PageLoader";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderItem = {
  id: number;
  name: string;
  qty: number;
  status: string;
  notes?: string | null;
  addOns?: { name: string; price: number }[];
};

// "current" slice of GET /analytics/:restaurantId/:branchId/peak-hour-analysis
// — advisory only, nothing here auto-holds an order.
type BottleneckInfo = {
  queueDepth: number;
  isBottleneckNow: boolean;
  utilizationPercentNow: number | null;
  throttleSuggested: boolean;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getElapsed(createdAt: string, now: number): string {
  const diff = Math.floor((now - new Date(createdAt).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  if (diff < 3600) return `${m}m ${s}s`;
  return `${Math.floor(diff / 3600)}h ${m % 60}m`;
}

function getElapsedColor(createdAt: string, now: number): string {
  const mins = Math.floor((now - new Date(createdAt).getTime()) / 60000);
  if (mins >= 15) return "text-red-500";
  if (mins >= 8) return "text-orange-400";
  return "text-emerald-400";
}

// Returns individual items with id + status — not aggregated.
// skipBatchIds: batch IDs from previous READY cycles.
function flattenItems(order: any, skipBatchIds?: Set<number>): OrderItem[] {
  const result: OrderItem[] = [];
  if (order.batches) {
    order.batches.forEach((batch: any) => {
      if (skipBatchIds?.has(batch.id)) return;
      (batch.items ?? []).forEach((item: any) => {
        result.push({
          id:     item.id,
          name:   item.itemName ?? item.name ?? "Item",
          qty:    item.quantity ?? 1,
          status: item.status ?? "PENDING",
          notes:  item.notes,
          addOns: item.addOns,
        });
      });
    });
  } else {
    (order.items ?? []).forEach((item: any) => {
      result.push({
        id:     item.id,
        name:   item.itemName ?? item.name ?? "Item",
        qty:    item.quantity ?? 1,
        status: item.status ?? "PENDING",
        notes:  item.notes,
        addOns: item.addOns,
      });
    });
  }
  return result;
}

function aggregateByDish(orders: any[], processedBatches: Map<number, Set<number>>) {
  const map: Record<string, { total: number; sources: { label: string; qty: number; kot: string }[] }> = {};
  for (const order of orders) {
    const skipBatchIds = processedBatches.get(order.id);
    const label = order.tableName ?? (order.tableId ? `T${order.tableId}` : "Takeaway");
    const kot   = `KOT-${order.orderNo ?? order.id}`;
    for (const item of flattenItems(order, skipBatchIds)) {
      if (item.status === "CANCELLED") continue;
      if (!map[item.name]) map[item.name] = { total: 0, sources: [] };
      map[item.name].total += item.qty;
      map[item.name].sources.push({ label, qty: item.qty, kot });
    }
  }
  return Object.entries(map)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.total - a.total);
}

// ─── ElapsedBadge ────────────────────────────────────────────────────────────
// Owns its own 1-second tick so only this small badge re-renders every
// second — the rest of KitchenPage (and every other OrderCard) no longer has
// to re-render/recompute just because a clock ticked somewhere on the page.

function ElapsedBadgeBase({ createdAt }: { createdAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className={`flex items-center gap-1 text-xs font-black ${getElapsedColor(createdAt, now)}`}>
      <Clock className="h-3 w-3" />
      {getElapsed(createdAt, now)}
    </div>
  );
}
const ElapsedBadge = memo(ElapsedBadgeBase);

// ─── OrderCard ───────────────────────────────────────────────────────────────

type CardProps = {
  order:          any;
  onMarkReady:    (order: any) => void;
  isUpdating:     boolean;
  pendingToggles: Record<number, boolean>;   // itemId → optimistic done override
  onToggle:       (orderId: number, itemId: number, currentlyChecked: boolean) => void;
  skipBatchIds:   Set<number> | undefined;
  onCancelApprove: (itemId: number, orderId: number) => void;
  onCancelReject:  (itemId: number, orderId: number) => void;
  isHeld:         boolean;
  isHolding:      boolean;
  onHold:         (order: any) => void;
  onResume:       (order: any) => void;
};

function OrderCardBase({
  order, onMarkReady, isUpdating, pendingToggles, onToggle, skipBatchIds,
  onCancelApprove, onCancelReject, isHeld, isHolding, onHold, onResume,
}: CardProps) {
  const items           = flattenItems(order, skipBatchIds);
  const isChecked       = (item: OrderItem) => pendingToggles[item.id] ?? item.status === "DONE";
  const activeItems     = items.filter(i => i.status !== "CANCELLED" && i.status !== "CANCEL_REQUESTED");
  const cancelRequests  = items.filter(i => i.status === "CANCEL_REQUESTED");
  const cancelledItems  = items.filter(i => i.status === "CANCELLED");
  const allActiveDone   = activeItems.length > 0 && activeItems.every(isChecked);
  const hasCancelReqs   = cancelRequests.length > 0;
  const canMarkReady    = allActiveDone && !hasCancelReqs && activeItems.length > 0;

  const tableName = order.tableName ?? order.table?.name ?? (order.tableId ? `Table ${order.tableId}` : "Takeaway");
  const kot       = order.orderNo ?? order.id;

  return (
    <div className={`flex flex-col rounded-2xl border-2 bg-white shadow-sm transition-all ${
      isHeld ? "border-gray-300 opacity-70" : hasCancelReqs ? "border-orange-400" : canMarkReady ? "border-emerald-300" : "border-blue-200"
    }`}>
      {/* Header */}
      <div className={`rounded-t-xl px-3 py-2 ${
        isHeld ? "bg-gray-100" : hasCancelReqs ? "bg-orange-50" : canMarkReady ? "bg-emerald-50" : "bg-blue-50"
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-lg font-black text-gray-900">{tableName}</span>
              {isHeld ? (
                <StatusBadge tone="bg-gray-200 text-gray-600" size="sm" className="uppercase tracking-widest">
                  ⏸ Held
                </StatusBadge>
              ) : (
                <StatusBadge tone="bg-blue-100 text-blue-700" size="sm" className="uppercase tracking-widest">
                  Preparing
                </StatusBadge>
              )}
              {order.orderType === "TAKE_AWAY" && (
                <StatusBadge tone="bg-purple-100 text-purple-700" size="sm" className="uppercase tracking-widest">
                  📦 Parcel
                </StatusBadge>
              )}
              {hasCancelReqs && (
                <StatusBadge tone="bg-orange-100 text-orange-700" size="sm" className="uppercase animate-pulse">
                  ⚠ Cancel Request
                </StatusBadge>
              )}
            </div>
            <p className="mt-0.5 text-[10px] font-black text-gray-500">KOT #{kot}</p>
          </div>
          <ElapsedBadge createdAt={order.createdAt} />
        </div>
      </div>

      {/* Items */}
      <div className={`flex-1 p-3 space-y-1.5 ${isHeld ? "pointer-events-none opacity-50" : ""}`}>
        {items.length === 0 && (
          <p className="text-xs italic text-gray-400">No new items</p>
        )}

        {/* Cancel requests — kitchen must resolve first */}
        {cancelRequests.map(item => (
          <div key={item.id} className="rounded-lg border-2 border-orange-300 bg-orange-50 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-gray-900">{item.name} <span className="text-gray-500">× {item.qty}</span></p>
                <p className="text-[9px] font-black text-orange-600 uppercase tracking-wide">Cancel Requested</p>
              </div>
              <div className="flex gap-2.5 shrink-0">
                <button
                  onClick={() => onCancelApprove(item.id, order.id)}
                  className="rounded-lg bg-red-500 px-3 py-2 text-[10px] font-black text-white transition hover:bg-red-600"
                >
                  Cancel ✓
                </button>
                <button
                  onClick={() => onCancelReject(item.id, order.id)}
                  className="rounded-lg bg-gray-200 px-3 py-2 text-[10px] font-black text-gray-700 transition hover:bg-gray-300"
                >
                  Keep ✗
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Active items — checkboxes */}
        {activeItems.map(item => {
          const checked = isChecked(item);
          return (
            <button
              key={item.id}
              onClick={() => onToggle(order.id, item.id, checked)}
              className={`flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left transition active:scale-[0.98] ${
                checked ? "bg-emerald-50" : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div className="flex w-full items-center gap-2">
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${
                  checked ? "border-emerald-500 bg-emerald-500" : "border-gray-300"
                }`}>
                  {checked && <span className="text-[9px] font-black text-white">✓</span>}
                </div>
                <span className={`flex-1 text-sm font-semibold leading-tight ${checked ? "text-gray-400 line-through" : "text-gray-800"}`}>
                  {item.name}
                </span>
                <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-black text-gray-700">
                  ×{item.qty}
                </span>
              </div>
              {(item.addOns?.length || 0) > 0 && (
                <p className="pl-6 text-[10px] font-bold text-violet-600">
                  + {item.addOns!.map((a) => a.name).join(", ")}
                </p>
              )}
              {item.notes && (
                <p className="pl-6 text-[10px] font-bold italic text-amber-600">
                  📝 {item.notes}
                </p>
              )}
            </button>
          );
        })}

        {/* Cancelled items — greyed strikethrough */}
        {cancelledItems.map(item => (
          <div key={item.id} className="flex items-center gap-2 px-2 py-1 opacity-40">
            <div className="h-4 w-4 shrink-0 rounded border-2 border-gray-200 bg-gray-100" />
            <span className="flex-1 text-sm font-semibold text-gray-400 line-through">{item.name}</span>
            <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[8px] font-black text-red-500">Cancelled</span>
          </div>
        ))}
      </div>

      {/* Action footer */}
      <div className="border-t border-gray-100 p-2.5 space-y-1.5">
        {isHeld ? (
          <button
            onClick={() => onResume(order)}
            disabled={isHolding}
            className="h-9 w-full rounded-xl bg-blue-500 text-xs font-black text-white shadow-sm transition active:scale-[0.99] hover:bg-blue-600 disabled:opacity-60"
          >
            {isHolding ? "Resuming..." : "▶ Resume Order"}
          </button>
        ) : (
          <>
            {hasCancelReqs ? (
              <div className="flex h-9 w-full items-center justify-center rounded-xl bg-orange-50 text-xs font-black text-orange-600">
                ⚠ Resolve cancellations above first
              </div>
            ) : (
              <button
                onClick={() => onMarkReady(order)}
                disabled={isUpdating || !canMarkReady}
                className={`h-9 w-full rounded-xl text-xs font-black text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60 ${
                  canMarkReady ? "bg-emerald-500 hover:bg-emerald-600" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isUpdating
                  ? "Completing..."
                  : canMarkReady
                    ? "✓ Mark Order Ready"
                    : `${activeItems.filter(isChecked).length} / ${activeItems.length} items done`}
              </button>
            )}
            <button
              onClick={() => onHold(order)}
              disabled={isHolding}
              className="h-8 w-full rounded-xl border border-gray-200 bg-white text-[11px] font-black text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {isHolding ? "Holding..." : "⏸ Hold Order"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
const OrderCard = memo(OrderCardBase);

// ─── Club View ───────────────────────────────────────────────────────────────

function ClubViewBase({ orders, processedBatches }: { orders: any[]; processedBatches: Map<number, Set<number>> }) {
  // processedBatches is a ref-held Map with a stable identity across renders
  // (mutated in place, not replaced) — this only recomputes when `orders`
  // itself changes (e.g. the 30s poll), not on unrelated re-renders.
  const dishes = useMemo(() => aggregateByDish(orders, processedBatches), [orders, processedBatches]);
  if (dishes.length === 0) {
    return (
      <EmptyState
        icon={<Layers className="h-10 w-10 text-gray-200" />}
        title="No active orders to club"
        className="h-full py-16"
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {dishes.map(dish => (
        <div key={dish.name} className="rounded-2xl border-2 border-orange-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-black text-gray-900">{dish.name}</p>
            <span className="ml-2 shrink-0 rounded-lg bg-orange-100 px-2.5 py-1 text-sm font-black text-orange-700">×{dish.total}</span>
          </div>
          <div className="mt-2.5 space-y-1">
            {dish.sources.map((src, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-1.5">
                <span className="text-xs font-black text-gray-800">{src.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600">{src.kot}</span>
                  <span className="rounded-lg bg-orange-100 px-2 py-0.5 text-xs font-black text-orange-700">×{src.qty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
const ClubView = memo(ClubViewBase);

// ─── Availability View ───────────────────────────────────────────────────────
// Lets kitchen staff mark a dish sold out (or back in stock) themselves,
// since they're the ones who know what ingredients have actually run out.

type MenuItemRow = { id: number; name: string; categoryId: number | null; isAvailable: boolean };

function AvailabilityViewBase({
  items, categories, search, setSearch, togglingId, onToggle,
}: {
  items: MenuItemRow[];
  categories: { id: number; name: string }[];
  search: string;
  setSearch: (v: string) => void;
  togglingId: number | null;
  onToggle: (item: MenuItemRow) => void;
}) {
  const categoryName = (id: number | null) =>
    categories.find(c => c.id === id)?.name ?? "Uncategorized";

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const grouped = filtered.reduce<Record<string, MenuItemRow[]>>((acc, item) => {
    const key = categoryName(item.categoryId);
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Ban className="h-10 w-10 text-gray-200" />}
        title="No menu items found"
        className="h-full py-16"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dish..."
          className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-xs outline-none transition focus:border-red-300"
        />
      </div>
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-3 py-2">
            <p className="text-xs font-black text-gray-700">{cat}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {catItems.map(item => (
              <div key={item.id} className="flex items-center justify-between px-3 py-2.5">
                <span className={`text-sm font-semibold ${item.isAvailable ? "text-gray-900" : "text-gray-400 line-through"}`}>
                  {item.name}
                </span>
                <button
                  onClick={() => onToggle(item)}
                  disabled={togglingId === item.id}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black transition disabled:opacity-50 ${
                    item.isAvailable
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-red-100 text-red-600 hover:bg-red-200"
                  }`}
                >
                  {togglingId === item.id ? "…" : item.isAvailable ? "Available" : "Sold Out"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
const AvailabilityView = memo(AvailabilityViewBase);

// ─── KitchenPage ─────────────────────────────────────────────────────────────

export default function KitchenPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [orders,       setOrders]       = useState<any[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [updatingId,   setUpdatingId]   = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  // "Done" is persisted server-side on the item itself (status: "DONE") so
  // every KDS device shares one checklist — this only holds an optimistic
  // itemId → done overlay for the brief window before the next fetch
  // confirms it, so taps still feel instant.
  const [pendingToggles, setPendingToggles] = useState<Record<number, boolean>>({});
  const [view,         setView]         = useState<"orders" | "club" | "availability">("orders");
  const [menuItems,    setMenuItems]    = useState<MenuItemRow[]>([]);
  const [categories,   setCategories]   = useState<{ id: number; name: string }[]>([]);
  const [menuSearch,   setMenuSearch]   = useState("");
  const [togglingId,   setTogglingId]   = useState<number | null>(null);
  const [holdingId,    setHoldingId]    = useState<number | null>(null);
  // The backend's hold endpoint doesn't come with a confirmed status-field
  // contract we can rely on yet, so held-ness is tracked locally (set on a
  // successful hold call, cleared on a successful resume) — this keeps the
  // buttons fully functional regardless of what field name the server ends
  // up using, while still layering on `order.status === "HELD"` below in
  // case the server does report that value.
  const [heldOrderIds, setHeldOrderIds] = useState<Set<number>>(new Set());
  const [bottleneck,   setBottleneck]   = useState<BottleneckInfo | null>(null);

  const processedBatchesRef = useRef<Map<number, Set<number>>>(new Map());
  const prevStatusRef       = useRef<Map<number, string>>(new Map());
  const autoCompletingRef   = useRef<Set<number>>(new Set());
  const transitionedRef     = useRef<Set<number>>(new Set());

  const fetchOrders = useCallback(async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    setLoading(true);
    try {
      const res = await getAllRunningOrders(user.restaurantId, user.branchId);
      if (res?.success) {
        const data: any[] = res.data ?? [];

        // Detect re-activated orders (new batch) — a fresh batch's items
        // come back PENDING from the server on their own, so there's no
        // client-side "done" state left to reset anymore.
        for (const order of data) {
          const prev = prevStatusRef.current.get(order.id);
          const curr: string = order.status ?? "PENDING";
          if (prev !== undefined && prev !== "PENDING" && curr === "PENDING") {
            autoCompletingRef.current.delete(order.id);
          }
          prevStatusRef.current.set(order.id, curr);
        }

        // Server data is authoritative now — drop any optimistic overlay so
        // a toggle that raced with this poll doesn't stick around stale.
        setPendingToggles({});

        setOrders(data);
        setLastRefreshed(new Date());

        // Auto-transition NEW/PENDING → PREPARING
        data
          .filter((o: any) => !o.status || o.status === "PENDING" || o.status === "NEW")
          .forEach((o: any) => {
            if (!transitionedRef.current.has(o.id)) {
              transitionedRef.current.add(o.id);
              updateRunningOrderStatus(o.id, "PREPARING").catch(() => {});
            }
          });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId, user?.branchId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  usePolling(fetchOrders, 30000, [fetchOrders]);

  // Advisory-only capacity signal — never holds an order automatically,
  // just surfaces a banner so staff can decide to hold new orders themselves.
  const fetchBottleneck = useCallback(async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await api.get(
        `/analytics/${user.restaurantId}/${user.branchId}/peak-hour-analysis?from=${today}&to=${today}`,
      );
      if (res.data?.success) {
        setBottleneck(res.data.data?.current ?? null);
      }
    } catch {
      // silent — advisory banner only, not on the critical KDS path
    }
  }, [user?.restaurantId, user?.branchId]);

  useEffect(() => {
    fetchBottleneck();
  }, [fetchBottleneck]);
  usePolling(fetchBottleneck, 30000, [fetchBottleneck]);

  const fetchMenuAvailability = useCallback(async () => {
    if (!user?.branchId) return;
    try {
      const res = await getBranchDetails(user.branchId);
      const rItems = res?.data?.restaurant?.menuItems ?? [];
      setMenuItems(rItems.map((m: any) => ({
        id: m.id, name: m.name, categoryId: m.categoryId, isAvailable: m.isAvailable !== false,
      })));
      setCategories(res?.data?.restaurant?.categories ?? []);
    } catch { /* silent */ }
  }, [user?.branchId]);

  useEffect(() => {
    if (view === "availability") fetchMenuAvailability();
  }, [view, fetchMenuAvailability]);

  const handleToggleAvailability = useCallback(async (item: MenuItemRow) => {
    const nextAvailable = !item.isAvailable;
    setTogglingId(item.id);
    // Optimistic update — kitchen needs this to feel instant during service.
    setMenuItems(prev => prev.map(m => (m.id === item.id ? { ...m, isAvailable: nextAvailable } : m)));
    try {
      await setMenuItemAvailability(item.id, nextAvailable);
    } catch {
      // Roll back on failure
      setMenuItems(prev => prev.map(m => (m.id === item.id ? { ...m, isAvailable: item.isAvailable } : m)));
    } finally {
      setTogglingId(null);
    }
  }, []);

  const handleMarkReady = useCallback(async (order: any) => {
    if (order.batches?.length) {
      const existing = processedBatchesRef.current.get(order.id) ?? new Set<number>();
      processedBatchesRef.current.set(order.id, new Set([
        ...existing,
        ...(order.batches as any[]).map((b: any) => b.id as number),
      ]));
    }
    setUpdatingId(order.id);
    try {
      await updateRunningOrderStatus(order.id, "READY");
      await fetchOrders();
    } catch {
      // silent
    } finally {
      setUpdatingId(null);
    }
  }, [fetchOrders]);

  const handleCancelApprove = useCallback(async (itemId: number) => {
    try {
      await approveItemCancel(itemId);
      await fetchOrders();
    } catch { /* silent */ }
  }, [fetchOrders]);

  const handleCancelReject = useCallback(async (itemId: number) => {
    try {
      await rejectItemCancel(itemId);
      await fetchOrders();
    } catch { /* silent */ }
  }, [fetchOrders]);

  const handleHoldOrder = useCallback(async (order: any) => {
    setHoldingId(order.id);
    try {
      await holdRunningOrder(order.id);
      setHeldOrderIds(prev => new Set(prev).add(order.id));
      await fetchOrders();
    } catch {
      // silent — order stays active, staff can retry
    } finally {
      setHoldingId(null);
    }
  }, [fetchOrders]);

  const handleResumeOrder = useCallback(async (order: any) => {
    setHoldingId(order.id);
    try {
      await resumeRunningOrder(order.id);
      setHeldOrderIds(prev => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
      await fetchOrders();
    } catch {
      // silent — order stays held, staff can retry
    } finally {
      setHoldingId(null);
    }
  }, [fetchOrders]);

  // Auto-complete: all active (PENDING/DONE) items checked off and no pending
  // cancel requests. "Checked" is the server's item.status === "DONE",
  // overridden by any still-in-flight optimistic toggle.
  useEffect(() => {
    for (const order of orders) {
      if (order.status !== "PREPARING") continue;
      // A held order must stay untouched until staff explicitly resumes it —
      // skip even if its items happen to already be fully checked off.
      if (order.status === "HELD" || heldOrderIds.has(order.id)) continue;
      const skipBatchIds = processedBatchesRef.current.get(order.id);
      const items        = flattenItems(order, skipBatchIds);
      const activeItems  = items.filter(i => i.status !== "CANCELLED" && i.status !== "CANCEL_REQUESTED");
      const hasCancelReqs = items.some(i => i.status === "CANCEL_REQUESTED");

      if (
        !hasCancelReqs &&
        activeItems.length > 0 &&
        activeItems.every(i => pendingToggles[i.id] ?? i.status === "DONE") &&
        !autoCompletingRef.current.has(order.id)
      ) {
        autoCompletingRef.current.add(order.id);
        handleMarkReady(order);
      }
    }
  }, [pendingToggles, orders, handleMarkReady, heldOrderIds]);

  const handleItemToggle = useCallback(async (_orderId: number, itemId: number, currentlyChecked: boolean) => {
    const next = !currentlyChecked;
    setPendingToggles(prev => ({ ...prev, [itemId]: next }));
    try {
      await toggleItemDone(itemId, next);
    } catch {
      // Revert the optimistic flip — the server never confirmed it.
      setPendingToggles(prev => ({ ...prev, [itemId]: currentlyChecked }));
    }
  }, []);

  const preparingOrders = useMemo(
    () =>
      orders.filter(
        o =>
          !o.status || o.status === "PENDING" || o.status === "NEW" || o.status === "PREPARING" ||
          o.status === "HELD" || heldOrderIds.has(o.id),
      ),
    [orders, heldOrderIds],
  );

  const isOrderHeld = useCallback(
    (order: any) => order.status === "HELD" || heldOrderIds.has(order.id),
    [heldOrderIds],
  );

  if (loading && orders.length === 0) return <PageLoader />;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100">
              <ChefHat className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-gray-900">Kitchen Display</h1>
              <p className="text-[10px] text-gray-400">
                {preparingOrders.length} preparing · {lastRefreshed.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button onClick={() => setView("orders")}
                className={`rounded-md px-3 py-2 text-[11px] font-black transition ${view === "orders" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>
                Orders
              </button>
              <button onClick={() => setView("club")}
                className={`flex items-center gap-1 rounded-md px-3 py-2 text-[11px] font-black transition ${view === "club" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>
                <Layers className="h-3 w-3" />
                Club
              </button>
              <button onClick={() => setView("availability")}
                className={`flex items-center gap-1 rounded-md px-3 py-2 text-[11px] font-black transition ${view === "availability" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>
                <Ban className="h-3 w-3" />
                Availability
              </button>
            </div>
            <button onClick={fetchOrders} disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {view === "orders" && bottleneck?.throttleSuggested && (
          <div className="mb-3 flex items-center gap-2.5 rounded-2xl border-2 border-orange-300 bg-orange-50 px-4 py-3 shadow-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </span>
            <div>
              <p className="text-xs font-black text-orange-700">
                Kitchen at capacity (queue depth: {bottleneck.queueDepth}) — consider holding new orders.
              </p>
              <p className="text-[10px] font-bold text-orange-500">
                This is advisory only — no order is held automatically.
              </p>
            </div>
          </div>
        )}
        {view === "availability" ? (
          <AvailabilityView
            items={menuItems}
            categories={categories}
            search={menuSearch}
            setSearch={setMenuSearch}
            togglingId={togglingId}
            onToggle={handleToggleAvailability}
          />
        ) : preparingOrders.length === 0 && !loading ? (
          <EmptyState
            icon={<UtensilsCrossed className="h-10 w-10 text-gray-300" />}
            title="No active orders"
            description="New orders will appear here automatically"
            className="h-full py-16"
          />
        ) : view === "club" ? (
          <ClubView orders={preparingOrders} processedBatches={processedBatchesRef.current} />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {preparingOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onMarkReady={handleMarkReady}
                isUpdating={updatingId === order.id}
                pendingToggles={pendingToggles}
                onToggle={handleItemToggle}
                skipBatchIds={processedBatchesRef.current.get(order.id)}
                onCancelApprove={handleCancelApprove}
                onCancelReject={handleCancelReject}
                isHeld={isOrderHeld(order)}
                isHolding={holdingId === order.id}
                onHold={handleHoldOrder}
                onResume={handleResumeOrder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
