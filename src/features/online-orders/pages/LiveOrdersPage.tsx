import { useMemo, useState } from "react";
import { MagnifyingGlassIcon, CheckCircleIcon } from "@heroicons/react/24/solid";

type OnlineOrder = { id: string; customer: string; platform: string; status: string; items: number; amount: number; time: string };

const INITIAL_ORDERS: OnlineOrder[] = [
  { id: "SWG-1001", customer: "Rahul", platform: "SWIGGY", status: "NEW", items: 5, amount: 560, time: "5 mins ago" },
  { id: "ZMT-1002", customer: "Karthik", platform: "ZOMATO", status: "PREPARING", items: 2, amount: 420, time: "12 mins ago" },
  { id: "SWG-1003", customer: "Arun", platform: "SWIGGY", status: "READY", items: 4, amount: 860, time: "18 mins ago" },
  { id: "ZMT-1004", customer: "Sanjay", platform: "ZOMATO", status: "NEW", items: 3, amount: 390, time: "22 mins ago" },
];

const STATUS_FILTERS = ["ALL", "NEW", "PREPARING", "READY"];

export default function OnlineOrders() {
  const [orders, setOrders] = useState<OnlineOrder[]>(INITIAL_ORDERS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const markDone = (id: string) => setOrders((prev) => prev.filter((o) => o.id !== id));

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.customer.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "ALL" || order.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const getPlatformStyle = (p: string) => {
    if (p === "SWIGGY") return "bg-orange-100 text-orange-700";
    if (p === "ZOMATO") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const getStatusStyle = (s: string) => {
    if (s === "NEW") return "bg-blue-100 text-blue-700";
    if (s === "PREPARING") return "bg-yellow-100 text-yellow-700";
    if (s === "READY") return "bg-emerald-100 text-emerald-700";
    return "bg-gray-100 text-gray-700";
  };

  const getStatusDot = (s: string) => {
    if (s === "NEW") return "bg-blue-500";
    if (s === "PREPARING") return "bg-yellow-500 animate-pulse";
    if (s === "READY") return "bg-emerald-500";
    return "bg-gray-400";
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* HEADER */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-3 py-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-base font-black tracking-tight text-gray-900">Online Orders</h1>
            <p className="text-[10px] text-gray-500">Swiggy & Zomato live orders</p>
          </div>
          <div className="flex items-center gap-2">
            {/* FILTER PILLS */}
            <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {STATUS_FILTERS.map((item) => (
                <button key={item} onClick={() => setFilter(item)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition ${filter === item ? "bg-red-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
                  {item}
                </button>
              ))}
            </div>
            {/* SEARCH */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
                className="h-8 w-32 rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-2.5 text-xs outline-none transition focus:border-red-300 focus:bg-white sm:w-40" />
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 xl:p-3">
        {/* MOBILE CARDS */}
        <div className="space-y-2 xl:hidden">
          {filteredOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-3xl">🛵</span>
              <p className="mt-2 text-sm font-bold text-gray-700">No orders</p>
            </div>
          )}
          {filteredOrders.map((order) => (
            <div key={order.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${getStatusDot(order.status)}`} />
                  <div>
                    <p className="text-xs font-black text-gray-900">{order.id}</p>
                    <p className="text-[10px] text-gray-500">{order.time}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${getPlatformStyle(order.platform)}`}>{order.platform}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${getStatusStyle(order.status)}`}>{order.status}</span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-900">{order.customer}</p>
                  <p className="text-[10px] text-gray-500">{order.items} items</p>
                </div>
                <p className="text-lg font-black text-red-600">₹{order.amount}</p>
              </div>
              <div className="mt-2 border-t border-gray-100 pt-2 flex justify-end">
                <button onClick={() => markDone(order.id)} className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[10px] font-black text-white transition hover:bg-emerald-600">
                  <CheckCircleIcon className="h-3.5 w-3.5" /> Mark Done
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden xl:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-auto max-h-[calc(100vh-130px)]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-gray-200">
                  {["Order", "Customer", "Platform", "Status", "Items", "Time", "Amount", "Action"].map((h, i) => (
                    <th key={h} className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-500 ${i === 6 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <tr key={order.id}
                    className={`border-b border-gray-100 transition hover:bg-red-50/50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                    <td className="px-3 py-2 text-xs font-bold text-gray-800">{order.id}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-900">{order.customer}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getPlatformStyle(order.platform)}`}>{order.platform}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusStyle(order.status)}`}>{order.status}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{order.items} items</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{order.time}</td>
                    <td className="px-3 py-2 text-right">
                      <p className="text-sm font-black text-red-600">₹{order.amount}</p>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => markDone(order.id)} className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-emerald-600">
                        <CheckCircleIcon className="h-3 w-3" /> Done
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-3xl">🛵</span>
                <p className="mt-3 text-sm font-bold text-gray-700">No orders</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
