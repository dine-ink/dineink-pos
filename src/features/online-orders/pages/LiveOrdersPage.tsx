import { memo, useCallback, useMemo, useState } from "react";
import { MagnifyingGlassIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Banner } from "@/components/ui/page";

/**
 * ⚠️ PLACEHOLDER SCREEN — NOT CONNECTED TO SWIGGY OR ZOMATO.
 *
 * Every row below comes from the hardcoded DEMO_ORDERS array. There is no API
 * call in this file, no polling, and no aggregator integration anywhere in the
 * app: "Mark Done" only drops the row from local component state, and a page
 * refresh brings all four back.
 *
 * The banner in the UI says so explicitly, and deliberately so. This screen
 * sits in the main nav as "Online" for cashiers and managers, looks exactly
 * like the real Orders screen, and would otherwise be indistinguishable from
 * live data — a cashier could reasonably believe four delivery orders were
 * waiting and that ticking them off did something. Making it look polished
 * without saying it's fake would make that worse, not better.
 *
 * To make this real: replace DEMO_ORDERS with a fetch against a platform
 * integration, and route "Mark Done" to a status update.
 */

type OnlineOrder = { id: string; customer: string; platform: string; status: string; items: number; amount: number; time: string };

const DEMO_ORDERS: OnlineOrder[] = [
  { id: "SWG-1001", customer: "Rahul", platform: "SWIGGY", status: "NEW", items: 5, amount: 560, time: "5 mins ago" },
  { id: "ZMT-1002", customer: "Karthik", platform: "ZOMATO", status: "PREPARING", items: 2, amount: 420, time: "12 mins ago" },
  { id: "SWG-1003", customer: "Arun", platform: "SWIGGY", status: "READY", items: 4, amount: 860, time: "18 mins ago" },
  { id: "ZMT-1004", customer: "Sanjay", platform: "ZOMATO", status: "NEW", items: 3, amount: 390, time: "22 mins ago" },
];

const STATUS_FILTERS = ["ALL", "NEW", "PREPARING", "READY"];

const getPlatformStyle = (p: string) => {
  if (p === "SWIGGY") return "bg-orange-100 text-orange-700";
  if (p === "ZOMATO") return "bg-red-100 text-red-700";
  return "bg-secondary text-secondary-foreground";
};

const getStatusStyle = (s: string) => {
  if (s === "NEW") return "bg-info-muted text-info";
  if (s === "PREPARING") return "bg-warning-muted text-warning";
  if (s === "READY") return "bg-success-muted text-success";
  return "bg-secondary text-secondary-foreground";
};

const getStatusDot = (s: string) => {
  if (s === "NEW") return "bg-info";
  if (s === "PREPARING") return "bg-warning animate-pulse";
  if (s === "READY") return "bg-success";
  return "bg-subtle-foreground";
};

type RowProps = { order: OnlineOrder; onMarkDone: (id: string) => void };

function OnlineOrderCardBase({ order, onMarkDone }: RowProps) {
  return (
    <div className="rounded-card border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDot(order.status)}`} />
          <div>
            <p className="text-[0.8125rem] font-bold text-foreground">{order.id}</p>
            <p className="text-[0.6875rem] text-muted-foreground">{order.time}</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <StatusBadge tone={getPlatformStyle(order.platform)} size="sm">{order.platform}</StatusBadge>
          <StatusBadge tone={getStatusStyle(order.status)} size="sm">{order.status}</StatusBadge>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-[0.8125rem] font-bold text-foreground">{order.customer}</p>
          <p className="text-[0.6875rem] text-muted-foreground tnum">{order.items} items</p>
        </div>
        <p className="text-lg font-bold text-primary tnum">{formatCurrency(order.amount)}</p>
      </div>
      <div className="mt-2.5 flex justify-end border-t border-border pt-2.5">
        <button
          onClick={() => onMarkDone(order.id)}
          className="flex h-11 items-center gap-1.5 rounded-control bg-success px-3.5 text-xs font-bold text-success-foreground transition hover:brightness-110"
        >
          <CheckCircleIcon className="h-4 w-4" /> Mark Done
        </button>
      </div>
    </div>
  );
}
const OnlineOrderCard = memo(OnlineOrderCardBase);

function OnlineOrderRowBase({ order, onMarkDone, index }: RowProps & { index: number }) {
  return (
    <tr className={`border-b border-border transition hover:bg-red-50/50 ${index % 2 === 0 ? "bg-card" : "bg-muted/40"}`}>
      <td className="px-3 py-2.5 text-[0.8125rem] font-bold text-foreground">{order.id}</td>
      <td className="px-3 py-2.5 text-[0.8125rem] font-semibold text-foreground">{order.customer}</td>
      <td className="px-3 py-2.5">
        <StatusBadge tone={getPlatformStyle(order.platform)} size="md">{order.platform}</StatusBadge>
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge tone={getStatusStyle(order.status)} size="md">{order.status}</StatusBadge>
      </td>
      <td className="px-3 py-2.5 text-[0.8125rem] text-muted-foreground tnum">{order.items} items</td>
      <td className="px-3 py-2.5 text-[0.8125rem] text-muted-foreground">{order.time}</td>
      <td className="px-3 py-2.5 text-right">
        <p className="text-sm font-bold text-primary tnum">{formatCurrency(order.amount)}</p>
      </td>
      <td className="px-3 py-2.5">
        <button
          onClick={() => onMarkDone(order.id)}
          className="flex h-9 items-center gap-1.5 rounded-control bg-success px-3 text-xs font-bold text-success-foreground transition hover:brightness-110"
        >
          <CheckCircleIcon className="h-3.5 w-3.5" /> Done
        </button>
      </td>
    </tr>
  );
}
const OnlineOrderRow = memo(OnlineOrderRowBase);

export default function OnlineOrders() {
  const [orders, setOrders] = useState<OnlineOrder[]>(DEMO_ORDERS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const markDone = useCallback(
    (id: string) => setOrders((prev) => prev.filter((o) => o.id !== id)),
    [],
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.customer.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "ALL" || order.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [orders, search, filter]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* HEADER */}
      <div className="shrink-0 border-b border-border bg-card px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-foreground">Online Orders</h1>
            <p className="text-xs text-muted-foreground">Swiggy &amp; Zomato</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* FILTER PILLS */}
            <div className="flex items-center gap-0.5 rounded-control border border-border bg-muted p-0.5">
              {STATUS_FILTERS.map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  aria-pressed={filter === item}
                  className={`h-10 rounded-lg px-3 text-xs font-bold transition ${
                    filter === item
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            {/* SEARCH */}
            <div className="relative flex-1 sm:flex-none">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-11 w-full rounded-control border border-input bg-card pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary sm:w-48"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
        <div className="mb-3">
          <Banner
            tone="warning"
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Sample data — not connected to Swiggy or Zomato yet"
          >
            These four orders are built into the app for layout purposes. They are not real, “Mark Done” doesn’t send
            anything anywhere, and refreshing brings them back. Don’t work from this screen.
          </Banner>
        </div>

        {/* MOBILE CARDS */}
        <div className="flex flex-col gap-2 xl:hidden">
          {filteredOrders.length === 0 && (
            <EmptyState icon={<span className="text-3xl">🛵</span>} title="No orders" className="py-12" />
          )}
          {filteredOrders.map((order) => (
            <OnlineOrderCard key={order.id} order={order} onMarkDone={markDone} />
          ))}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden overflow-hidden rounded-card border border-border bg-card shadow-sm xl:block">
          <div className="overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-muted/60">
                <tr className="border-b border-border">
                  {["Order", "Customer", "Platform", "Status", "Items", "Time", "Amount", "Action"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2.5 text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase ${
                        i === 6 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <OnlineOrderRow key={order.id} order={order} onMarkDone={markDone} index={index} />
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <EmptyState icon={<span className="text-3xl">🛵</span>} title="No orders" className="py-16" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
