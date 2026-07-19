import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  getAllRunningOrders,
  updateRunningOrderStatus,
  approveItemCancel,
  rejectItemCancel,
} from "@/services/runningOrderService";
import { getBranchDetails } from "@/services/branchService";
import { setMenuItemAvailability } from "@/services/menuService";
import { ChefHat, RefreshCw, Clock, UtensilsCrossed, Layers, Ban, Search } from "lucide-react";
import PageLoader from "@/components/ui/PageLoader";

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderItem = {
  id: number;
  name: string;
  qty: number;
  status: string;
  notes?: string | null;
  addOns?: { name: string; price: number }[];
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

// ─── OrderCard ───────────────────────────────────────────────────────────────

type CardProps = {
  order:          any;
  onMarkReady:    (order: any) => void;
  isUpdating:     boolean;
  done:           Set<number>;   // Set of item IDs (not indices)
  onToggle:       (orderId: number, itemId: number) => void;
  skipBatchIds:   Set<number> | undefined;
  now:            number;
  onCancelApprove: (itemId: number, orderId: number) => void;
  onCancelReject:  (itemId: number, orderId: number) => void;
};

function OrderCard({
  order, onMarkReady, isUpdating, done, onToggle, skipBatchIds,
  now, onCancelApprove, onCancelReject,
}: CardProps) {
  const items           = flattenItems(order, skipBatchIds);
  const activeItems     = items.filter(i => i.status === "PENDING" || (!i.status));
  const cancelRequests  = items.filter(i => i.status === "CANCEL_REQUESTED");
  const cancelledItems  = items.filter(i => i.status === "CANCELLED");
  const allActiveDone   = activeItems.length > 0 && activeItems.every(i => done.has(i.id));
  const hasCancelReqs   = cancelRequests.length > 0;
  const canMarkReady    = allActiveDone && !hasCancelReqs && activeItems.length > 0;

  const tableName = order.tableName ?? order.table?.name ?? (order.tableId ? `Table ${order.tableId}` : "Takeaway");
  const kot       = order.orderNo ?? order.id;

  return (
    <div className={`flex flex-col rounded-2xl border-2 bg-white shadow-sm transition-all ${
      hasCancelReqs ? "border-orange-400" : canMarkReady ? "border-emerald-300" : "border-blue-200"
    }`}>
      {/* Header */}
      <div className={`rounded-t-xl px-3 py-2 ${
        hasCancelReqs ? "bg-orange-50" : canMarkReady ? "bg-emerald-50" : "bg-blue-50"
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-lg font-black text-gray-900">{tableName}</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-700">
                Preparing
              </span>
              {order.orderType === "TAKE_AWAY" && (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-purple-700">
                  📦 Parcel
                </span>
              )}
              {hasCancelReqs && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-black uppercase text-orange-700 animate-pulse">
                  ⚠ Cancel Request
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[10px] font-black text-gray-500">KOT #{kot}</p>
          </div>
          <div className={`flex items-center gap-1 text-xs font-black ${getElapsedColor(order.createdAt, now)}`}>
            <Clock className="h-3 w-3" />
            {getElapsed(order.createdAt, now)}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 p-3 space-y-1.5">
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
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => onCancelApprove(item.id, order.id)}
                  className="rounded-lg bg-red-500 px-2 py-1 text-[10px] font-black text-white transition hover:bg-red-600"
                >
                  Cancel ✓
                </button>
                <button
                  onClick={() => onCancelReject(item.id, order.id)}
                  className="rounded-lg bg-gray-200 px-2 py-1 text-[10px] font-black text-gray-700 transition hover:bg-gray-300"
                >
                  Keep ✗
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Active items — checkboxes */}
        {activeItems.map(item => {
          const checked = done.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onToggle(order.id, item.id)}
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
      <div className="border-t border-gray-100 p-2.5">
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
                : `${done.size} / ${activeItems.length} items done`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Club View ───────────────────────────────────────────────────────────────

function ClubView({ orders, processedBatches }: { orders: any[]; processedBatches: Map<number, Set<number>> }) {
  const dishes = aggregateByDish(orders, processedBatches);
  if (dishes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-16 text-center">
        <Layers className="h-10 w-10 text-gray-200" />
        <p className="mt-3 text-sm font-bold text-gray-400">No active orders to club</p>
      </div>
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

// ─── Availability View ───────────────────────────────────────────────────────
// Lets kitchen staff mark a dish sold out (or back in stock) themselves,
// since they're the ones who know what ingredients have actually run out.

type MenuItemRow = { id: number; name: string; categoryId: number | null; isAvailable: boolean };

function AvailabilityView({
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
      <div className="flex h-full flex-col items-center justify-center py-16 text-center">
        <Ban className="h-10 w-10 text-gray-200" />
        <p className="mt-3 text-sm font-bold text-gray-400">No menu items found</p>
      </div>
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

// ─── KitchenPage ─────────────────────────────────────────────────────────────

export default function KitchenPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [orders,       setOrders]       = useState<any[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [updatingId,   setUpdatingId]   = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [now,          setNow]          = useState(Date.now());
  const [doneItems,    setDoneItems]    = useState<Record<number, Set<number>>>({}); // orderId → Set<itemId>
  const [view,         setView]         = useState<"orders" | "club" | "availability">("orders");
  const [menuItems,    setMenuItems]    = useState<MenuItemRow[]>([]);
  const [categories,   setCategories]   = useState<{ id: number; name: string }[]>([]);
  const [menuSearch,   setMenuSearch]   = useState("");
  const [togglingId,   setTogglingId]   = useState<number | null>(null);

  const processedBatchesRef = useRef<Map<number, Set<number>>>(new Map());
  const prevStatusRef       = useRef<Map<number, string>>(new Map());
  const autoCompletingRef   = useRef<Set<number>>(new Set());
  const transitionedRef     = useRef<Set<number>>(new Set());

  // 1-second tick for live timers
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    setLoading(true);
    try {
      const res = await getAllRunningOrders(user.restaurantId, user.branchId);
      if (res?.success) {
        const data: any[] = res.data ?? [];
        const activeIds = new Set(data.map((o: any) => o.id));

        // Detect re-activated orders (new batch) — clear their done state
        const toReset: number[] = [];
        for (const order of data) {
          const prev = prevStatusRef.current.get(order.id);
          const curr: string = order.status ?? "PENDING";
          if (prev !== undefined && prev !== "PENDING" && curr === "PENDING") {
            toReset.push(order.id);
            autoCompletingRef.current.delete(order.id);
          }
          prevStatusRef.current.set(order.id, curr);
        }

        setDoneItems(prev => {
          const next: Record<number, Set<number>> = {};
          Object.entries(prev).forEach(([k, v]) => {
            const id = Number(k);
            if (activeIds.has(id) && !toReset.includes(id)) next[id] = v;
            else autoCompletingRef.current.delete(id);
          });
          return next;
        });

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
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

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

  const handleCancelApprove = useCallback(async (itemId: number, orderId: number) => {
    try {
      await approveItemCancel(itemId);
      await fetchOrders();
      // Remove this item from done tracking if it was checked
      setDoneItems(prev => {
        const set = new Set(prev[orderId] ?? []);
        set.delete(itemId);
        return { ...prev, [orderId]: set };
      });
    } catch { /* silent */ }
  }, [fetchOrders]);

  const handleCancelReject = useCallback(async (itemId: number) => {
    try {
      await rejectItemCancel(itemId);
      await fetchOrders();
    } catch { /* silent */ }
  }, [fetchOrders]);

  // Auto-complete: all active (PENDING) items checked and no pending cancel requests
  useEffect(() => {
    for (const order of orders) {
      if (order.status !== "PREPARING") continue;
      const skipBatchIds = processedBatchesRef.current.get(order.id);
      const items        = flattenItems(order, skipBatchIds);
      const activeItems  = items.filter(i => i.status === "PENDING" || !i.status);
      const hasCancelReqs = items.some(i => i.status === "CANCEL_REQUESTED");
      const done         = doneItems[order.id];

      if (
        !hasCancelReqs &&
        done &&
        activeItems.length > 0 &&
        activeItems.every(i => done.has(i.id)) &&
        !autoCompletingRef.current.has(order.id)
      ) {
        autoCompletingRef.current.add(order.id);
        handleMarkReady(order);
      }
    }
  }, [doneItems, orders, handleMarkReady]);

  const handleItemToggle = useCallback((orderId: number, itemId: number) => {
    setDoneItems(prev => {
      const set = new Set(prev[orderId] ?? []);
      if (set.has(itemId)) set.delete(itemId);
      else set.add(itemId);
      return { ...prev, [orderId]: set };
    });
  }, []);

  const preparingOrders = orders.filter(
    o => !o.status || o.status === "PENDING" || o.status === "NEW" || o.status === "PREPARING",
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
                className={`rounded-md px-2.5 py-1 text-[11px] font-black transition ${view === "orders" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>
                Orders
              </button>
              <button onClick={() => setView("club")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-black transition ${view === "club" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>
                <Layers className="h-3 w-3" />
                Club
              </button>
              <button onClick={() => setView("availability")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-black transition ${view === "availability" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>
                <Ban className="h-3 w-3" />
                Availability
              </button>
            </div>
            <button onClick={fetchOrders} disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
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
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <UtensilsCrossed className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-bold text-gray-500">No active orders</p>
            <p className="text-xs text-gray-400">New orders will appear here automatically</p>
          </div>
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
                done={doneItems[order.id] ?? new Set()}
                onToggle={handleItemToggle}
                skipBatchIds={processedBatchesRef.current.get(order.id)}
                now={now}
                onCancelApprove={handleCancelApprove}
                onCancelReject={handleCancelReject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
