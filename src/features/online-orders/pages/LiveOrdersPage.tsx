import { useMemo, useState } from "react";

import {
  MagnifyingGlassIcon,
  EyeIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";

export default function OnlineOrders() {
  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("ALL");

  const orders = [
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

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.customer.toLowerCase().includes(search.toLowerCase());

      const matchesFilter = filter === "ALL" ? true : order.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const getPlatformStyle = (platform: string) => {
    switch (platform) {
      case "SWIGGY":
        return "bg-orange-100 text-orange-700";

      case "ZOMATO":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-blue-100 text-blue-700";

      case "PREPARING":
        return "bg-yellow-100 text-yellow-700";

      case "READY":
        return "bg-green-100 text-green-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#f8fafc] p-3 xl:p-5">
      {/* ================= HEADER ================= */}

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          {/* LEFT */}

          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Online Orders
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Swiggy & Zomato live orders
            </p>
          </div>

          {/* RIGHT */}

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            {/* FILTER */}

            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1">
              {["ALL", "NEW", "PREPARING", "READY"].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                    filter === item
                      ? "bg-red-500 text-white shadow"
                      : "text-gray-600"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* SEARCH */}

            <div className="relative w-full xl:w-[240px]">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order..."
                className="h-10 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm outline-none transition focus:border-red-300 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= TABLE ================= */}

      <div className="mt-4 max-h-[calc(100vh-220px)] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            {/* ================= HEADER ================= */}

            <thead className="sticky top-0 z-20 bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Order
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Customer
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Platform
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Status
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Items
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Time
                </th>

                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Amount
                </th>

                <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            {/* ================= BODY ================= */}

            <tbody>
              {filteredOrders.map((order, index) => (
                <tr
                  key={order.id}
                  className={`border-b border-gray-100 transition hover:bg-red-50 ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                  }`}
                >
                  {/* ORDER */}

                  <td className="px-4 py-3">
                    <p className="font-bold tracking-tight text-gray-800">
                      {order.id}
                    </p>
                  </td>

                  {/* CUSTOMER */}

                  <td className="px-4 py-3">
                    <p className="font-semibold text-[15px] text-gray-900">
                      {order.customer}
                    </p>
                  </td>

                  {/* PLATFORM */}

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold ${getPlatformStyle(
                        order.platform,
                      )}`}
                    >
                      {order.platform}
                    </span>
                  </td>

                  {/* STATUS */}

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold ${getStatusStyle(
                        order.status,
                      )}`}
                    >
                      {order.status}
                    </span>
                  </td>

                  {/* ITEMS */}

                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">{order.items} items</p>
                  </td>

                  {/* TIME */}

                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">{order.time}</p>
                  </td>

                  {/* AMOUNT */}

                  <td className="px-4 py-3 text-right">
                    <p className="text-xl font-black tracking-tight text-red-600">
                      ₹{order.amount}
                    </p>
                  </td>

                  {/* ACTION */}

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {/* VIEW */}

                      <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition hover:bg-blue-100">
                        <EyeIcon className="h-4 w-4" />
                      </button>

                      {/* COMPLETE */}

                      <button className="flex items-center gap-1 rounded-xl bg-green-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-600">
                        <CheckCircleIcon className="h-4 w-4" />
                        Done
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
