import { useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";

const SAMPLE_ORDERS = [
  {
    id: "SWG-1001",
    customer: "Rahul",
    platform: "SWIGGY",
    status: "NEW",
    items: 5,
    amount: 560,
    time: "5 mins ago",
  },
  {
    id: "ZMT-1002",
    customer: "Karthik",
    platform: "ZOMATO",
    status: "PREPARING",
    items: 2,
    amount: 420,
    time: "12 mins ago",
  },
  {
    id: "SWG-1003",
    customer: "Arun",
    platform: "SWIGGY",
    status: "READY",
    items: 4,
    amount: 860,
    time: "18 mins ago",
  },
  {
    id: "ZMT-1004",
    customer: "Sanjay",
    platform: "ZOMATO",
    status: "NEW",
    items: 3,
    amount: 390,
    time: "22 mins ago",
  },
];

const STATUS_FILTERS = ["ALL", "NEW", "PREPARING", "READY"];

export default function OnlineOrders() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const filteredOrders = useMemo(() => {
    return SAMPLE_ORDERS.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.customer.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "ALL" || order.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const getPlatformStyle = (platform: string) => {
    if (platform === "SWIGGY") return "bg-orange-100 text-orange-700";
    if (platform === "ZOMATO") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const getStatusStyle = (status: string) => {
    if (status === "NEW") return "bg-blue-100 text-blue-700";
    if (status === "PREPARING") return "bg-yellow-100 text-yellow-700";
    if (status === "READY") return "bg-emerald-100 text-emerald-700";
    return "bg-gray-100 text-gray-700";
  };

  const getStatusDot = (status: string) => {
    if (status === "NEW") return "bg-blue-500";
    if (status === "PREPARING") return "bg-yellow-500 animate-pulse";
    if (status === "READY") return "bg-emerald-500";
    return "bg-gray-400";
  };

  const newCount = SAMPLE_ORDERS.filter((o) => o.status === "NEW").length;
  const preparingCount = SAMPLE_ORDERS.filter(
    (o) => o.status === "PREPARING",
  ).length;
  const readyCount = SAMPLE_ORDERS.filter((o) => o.status === "READY").length;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* HEADER */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900">
              Online Orders
            </h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Swiggy & Zomato live orders
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* STATUS STATS - mobile */}
            <div className="flex gap-1.5 sm:hidden">
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                {newCount} New
              </span>
              <span className="rounded-full bg-yellow-50 px-2 py-1 text-[10px] font-black text-yellow-700">
                {preparingCount} Preparing
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                {readyCount} Ready
              </span>
            </div>

            <div className="flex gap-2">
              {/* FILTER PILLS */}
              <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
                {STATUS_FILTERS.map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      filter === item
                        ? "bg-red-500 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {/* SEARCH */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="h-9 w-36 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none transition focus:border-red-300 focus:bg-white sm:w-48"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 xl:p-4">
        {/* ===== MOBILE: CARD LIST ===== */}
        <div className="space-y-2.5 xl:hidden">
          {filteredOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl">🛵</span>
              <p className="mt-3 text-base font-bold text-gray-700">
                No orders
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Online orders will appear here
              </p>
            </div>
          )}
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              {/* TOP ROW */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${getStatusDot(order.status)}`}
                  />
                  <div>
                    <p className="text-sm font-black text-gray-900">
                      {order.id}
                    </p>
                    <p className="text-xs text-gray-500">{order.time}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${getPlatformStyle(order.platform)}`}
                  >
                    {order.platform}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${getStatusStyle(order.status)}`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              {/* MIDDLE */}
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="text-sm font-bold text-gray-900">
                    {order.customer}
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.items} items
                  </p>
                </div>
                <p className="text-xl font-black text-red-600">
                  ₹{order.amount}
                </p>
              </div>

              {/* ACTION */}
              <div className="mt-3 border-t border-gray-100 pt-3 flex justify-end">
                <button className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-600">
                  <CheckCircleIcon className="h-4 w-4" />
                  Mark Done
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ===== DESKTOP: TABLE ===== */}
        <div className="hidden xl:block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-auto max-h-[calc(100vh-200px)]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-gray-200">
                  {[
                    "Order",
                    "Customer",
                    "Platform",
                    "Status",
                    "Items",
                    "Time",
                    "Amount",
                    "Action",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[11px] font-black uppercase tracking-wider text-gray-500 ${
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
                  <tr
                    key={order.id}
                    className={`border-b border-gray-100 transition hover:bg-red-50/50 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-800">{order.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">
                        {order.customer}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${getPlatformStyle(order.platform)}`}
                      >
                        {order.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${getStatusStyle(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {order.items} items
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {order.time}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-lg font-black text-red-600">
                        ₹{order.amount}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <button className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600">
                        <CheckCircleIcon className="h-4 w-4" />
                        Done
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-4xl">🛵</span>
                <p className="mt-4 text-lg font-bold text-gray-700">
                  No orders
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Online orders will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
