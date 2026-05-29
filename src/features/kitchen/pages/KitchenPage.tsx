import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  getAllRunningOrders,
  updateRunningOrderStatus,
} from "@/services/runningOrderService";
import { ChefHat, RefreshCw, Clock, UtensilsCrossed } from "lucide-react";

function getElapsed(createdAt: string) {
  const diff = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 1000,
  );
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

function getElapsedColor(createdAt: string) {
  const mins = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 60000,
  );
  if (mins >= 15) return "text-red-400";
  if (mins >= 8) return "text-orange-400";
  return "text-emerald-400";
}

function flattenItems(order: any): { name: string; qty: number }[] {
  const map: Record<string, number> = {};
  const batches: any[] = order.batches ?? order.items ?? [];

  if (order.batches) {
    order.batches.forEach((batch: any) => {
      (batch.items ?? []).forEach((item: any) => {
        const name = item.itemName ?? item.name ?? "Item";
        map[name] = (map[name] ?? 0) + (item.quantity ?? 1);
      });
    });
  } else if (Array.isArray(batches)) {
    batches.forEach((item: any) => {
      const name = item.itemName ?? item.name ?? "Item";
      map[name] = (map[name] ?? 0) + (item.quantity ?? 1);
    });
  }

  return Object.entries(map).map(([name, qty]) => ({ name, qty }));
}

type OrderCardProps = {
  order: any;
  onAction: (id: number, status: "PREPARING" | "READY") => void;
  updatingId: number | null;
};

function OrderCard({ order, onAction, updatingId }: OrderCardProps) {
  const items = flattenItems(order);
  const isPending =
    !order.status || order.status === "PENDING" || order.status === "NEW";
  const isPreparing = order.status === "PREPARING";
  const tableName =
    order.tableName ?? order.table?.name ?? order.tableId ?? "—";
  const isUpdating = updatingId === order.id;

  return (
    <div
      className={`flex flex-col rounded-2xl border-2 bg-white shadow-sm transition-all ${
        isPending
          ? "border-orange-300"
          : isPreparing
            ? "border-blue-300"
            : "border-gray-200"
      }`}
    >
      {/* Card header */}
      <div
        className={`rounded-t-xl px-3 py-2 ${
          isPending
            ? "bg-orange-50"
            : isPreparing
              ? "bg-blue-50"
              : "bg-gray-50"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-gray-900">{tableName}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                isPending
                  ? "bg-orange-100 text-orange-700"
                  : isPreparing
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {isPending ? "New" : isPreparing ? "Preparing" : order.status}
            </span>
          </div>
          <div
            className={`flex items-center gap-1 text-xs font-black ${getElapsedColor(order.createdAt)}`}
          >
            <Clock className="h-3 w-3" />
            {getElapsed(order.createdAt)}
          </div>
        </div>
        {order.orderNo && (
          <p className="mt-0.5 text-[10px] text-gray-400 font-semibold">
            #{order.orderNo}
          </p>
        )}
      </div>

      {/* Items list */}
      <div className="flex-1 p-3">
        {items.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No items</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-800 leading-tight">
                  {item.name}
                </span>
                <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-black text-gray-700">
                  ×{item.qty}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Action button */}
      {(isPending || isPreparing) && (
        <div className="border-t border-gray-100 p-2.5">
          {isPending && (
            <button
              onClick={() => onAction(order.id, "PREPARING")}
              disabled={isUpdating}
              className="h-9 w-full rounded-xl bg-orange-500 text-xs font-black text-white shadow-sm transition hover:bg-orange-600 active:scale-[0.99] disabled:opacity-60"
            >
              {isUpdating ? "Updating..." : "Start Preparing"}
            </button>
          )}
          {isPreparing && (
            <button
              onClick={() => onAction(order.id, "READY")}
              disabled={isUpdating}
              className="h-9 w-full rounded-xl bg-emerald-500 text-xs font-black text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.99] disabled:opacity-60"
            >
              {isUpdating ? "Updating..." : "Mark Ready"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function KitchenPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchOrders = useCallback(async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    setLoading(true);
    try {
      const res = await getAllRunningOrders(user.restaurantId, user.branchId);
      if (res?.success) {
        setOrders(res.data ?? []);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error("Kitchen fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId, user?.branchId]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleAction = async (
    orderId: number,
    status: "PREPARING" | "READY",
  ) => {
    setUpdatingId(orderId);
    try {
      await updateRunningOrderStatus(orderId, status);
      await fetchOrders();
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingOrders = orders.filter(
    (o) => !o.status || o.status === "PENDING" || o.status === "NEW",
  );
  const preparingOrders = orders.filter((o) => o.status === "PREPARING");

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100">
              <ChefHat className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-gray-900">
                Kitchen Display
              </h1>
              <p className="text-[10px] text-gray-400">
                {pendingOrders.length} new · {preparingOrders.length} preparing
                {" · "}
                refreshed {lastRefreshed.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-5">
        {/* Empty state */}
        {orders.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center text-center py-16">
            <UtensilsCrossed className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-bold text-gray-500">
              No active orders
            </p>
            <p className="text-xs text-gray-400">
              New orders will appear here automatically
            </p>
          </div>
        )}

        {/* NEW ORDERS */}
        {pendingOrders.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              <h2 className="text-[11px] font-black uppercase tracking-widest text-orange-600">
                New Orders — {pendingOrders.length}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pendingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAction={handleAction}
                  updatingId={updatingId}
                />
              ))}
            </div>
          </section>
        )}

        {/* PREPARING */}
        {preparingOrders.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <h2 className="text-[11px] font-black uppercase tracking-widest text-blue-600">
                Preparing — {preparingOrders.length}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {preparingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAction={handleAction}
                  updatingId={updatingId}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
