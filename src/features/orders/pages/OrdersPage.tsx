import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  MagnifyingGlassIcon,
  EyeIcon,
  PrinterIcon,
} from "@heroicons/react/24/solid";

export default function OrderHistory() {
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const { user } = useAppSelector((state) => state.auth);

  const fetchOrders = async () => {
    try {
      const res = await fetch(
        `http://localhost:5500/api/bills/${user.restaurantId}/${user.branchId}/branchwise`,
      );

      const json = await res.json();

      if (json.success) {
        console.log("data =====", json.bills);
        setOrders(json.bills || []);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (user?.restaurantId) {
      fetchOrders();
    }
  }, []);
  const filteredOrders = orders.filter((order) => {
    const value = search.toLowerCase();

    const orderNo = String(order.orderNo || "").toLowerCase();

    const customer =
      typeof order.customer === "object"
        ? String(order.customer?.name || "").toLowerCase()
        : String(order.customer || "").toLowerCase();

    return orderNo.includes(value) || customer.includes(value);
  });
  const getTypeStyle = (type: string) => {
    switch (type) {
      case "DINE_IN":
        return "bg-blue-100 text-blue-700";

      case "SWIGGY":
        return "bg-orange-100 text-orange-700";

      case "ZOMATO":
        return "bg-red-100 text-red-700";

      case "TAKEAWAY":
        return "bg-purple-100 text-purple-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };
  const handleCompleteOrder = async (order: any) => {
    try {
      const res = await fetch(
        `http://localhost:5500/api/running-orders/closeRunningOrder`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            runningOrderId: order.id,

            customerName: order.customer,

            customerPhone: order.customerPhone,

            paymentMethod: order.paymentMethod || "CASH",

            orderType: order.orderType,
          }),
        },
      );

      const json = await res.json();

      if (json.success) {
        fetchOrders();
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="flex h-screen flex-col bg-[#f8fafc] p-3 xl:p-5">
      {/* ================= HEADER ================= */}

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {/* LEFT */}

          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Order History
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              All completed billing records
            </p>
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
                  Time
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Customer
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Type
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Table
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Items
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Payment
                </th>

                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Amount
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Payment Status
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Order Status
                </th>

                <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>

            {/* ================= BODY ================= */}

            <tbody>
              {filteredOrders.map((order, index) => (
                <tr
                  key={`${order.source}-${order.id}`}
                  className={`border-b border-gray-100 transition hover:bg-red-50 ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                  }`}
                >
                  {/* ORDER */}

                  <td className="px-4 py-3">
                    <p className="font-bold tracking-tight text-gray-800">
                      {order.orderNo}
                    </p>
                  </td>

                  {/* TIME */}

                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </td>

                  {/* CUSTOMER */}

                  <td className="px-4 py-3">
                    <p className="font-semibold text-[15px] text-gray-900">
                      {typeof order.customer === "object"
                        ? order.customer?.name
                        : order.customer || "Walk-in"}
                    </p>
                  </td>

                  {/* TYPE */}

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold ${getTypeStyle(
                        order.orderType,
                      )}`}
                    >
                      {order.orderType}
                    </span>
                  </td>

                  {/* TABLE */}

                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-700">
                      {order.table || "-"}
                    </p>
                  </td>

                  {/* ITEMS */}

                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">
                      {order.items?.length || 0} items
                    </p>
                  </td>

                  {/* PAYMENT METHOD */}

                  <td className="px-4 py-3">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold text-green-700">
                      {order.paymentMethod || "-"}
                    </span>
                  </td>

                  {/* AMOUNT */}

                  <td className="px-4 py-3 text-right">
                    <p className="text-xl font-black tracking-tight text-red-600">
                      ₹{Number(order.total || 0).toFixed(2)}
                    </p>
                  </td>

                  {/* PAYMENT STATUS */}

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                        order.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : order.status === "PARTIAL"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {order.status || "UNPAID"}
                    </span>
                  </td>

                  {/* ORDER STATUS */}

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                        order.orderStatus === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : order.orderStatus === "READY"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {order.orderStatus}
                    </span>
                  </td>

                  {/* ACTIONS */}

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {/* VIEW */}

                      <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition hover:bg-blue-100">
                        <EyeIcon className="h-4 w-4" />
                      </button>

                      {/* PRINT */}

                      <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100">
                        <PrinterIcon className="h-4 w-4" />
                      </button>

                      {/* COMPLETE ORDER */}

                      {order.orderStatus !== "COMPLETED" && (
                        <button
                          onClick={() => handleCompleteOrder(order)}
                          className="rounded-lg bg-green-500 px-3 py-1 text-[11px] font-bold text-white hover:bg-green-600"
                        >
                          Complete Order
                        </button>
                      )}
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
