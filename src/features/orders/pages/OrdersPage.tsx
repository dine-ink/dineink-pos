import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useAppSelector } from "@/store/hooks";
import { MagnifyingGlassIcon, PrinterIcon } from "@heroicons/react/24/solid";
import PageLoader from "@/components/ui/PageLoader";
import { api } from "@/services/api";
import { cancelBill } from "@/services/runningOrderService";
import { getSavedPrinter, printReceipt, type BillData } from "@/utils/printer";

const TYPE_BADGE: Record<string, string> = {
  DINE_IN: "bg-blue-100 text-blue-700",
  SWIGGY: "bg-orange-100 text-orange-700",
  ZOMATO: "bg-red-100 text-red-700",
  TAKE_AWAY: "bg-purple-100 text-purple-700",
};
const getTypeBadge = (t: string) => TYPE_BADGE[t] || "bg-gray-100 text-gray-700";
const getPayBadge = (s: string) =>
  s === "PAID"
    ? "bg-emerald-100 text-emerald-700"
    : s === "PARTIAL"
      ? "bg-yellow-100 text-yellow-700"
      : s === "CANCELLED"
        ? "bg-gray-200 text-gray-500"
        : "bg-red-100 text-red-700";
const getStatusBadge = (s: string) =>
  s === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : s === "READY" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700";
const customerDisplay = (order: any) =>
  typeof order.customer === "object" ? order.customer?.name || "Walk-in" : order.customer || "Walk-in";

export default function OrderHistory() {
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPrinter, setHasPrinter] = useState(false);
  const [voiding, setVoiding] = useState<number | null>(null);
  const { user } = useAppSelector((state) => state.auth);
  // On web/laptop the browser print dialog handles USB printers — always enabled
  const isNative = Capacitor.isNativePlatform();
  const canPrint = !isNative || hasPrinter;
  // Voiding a paid bill is financially sensitive — managers only.
  const canVoid = user?.role === "MANAGER";

  useEffect(() => {
    setHasPrinter(!!getSavedPrinter());
  }, []);

  const fetchOrders = async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    try {
      setLoading(true);
      const res = await api.get(`/bills/${user.restaurantId}/${user.branchId}/branchwise`);
      if (res.data.success) setOrders(res.data.bills || []);
    } catch {
      // silently fail, orders stays as empty array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.restaurantId && user?.branchId) fetchOrders();
  }, [user?.restaurantId, user?.branchId]);

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const v = search.toLowerCase();
    return orders.filter((o) => {
      const orderNo = String(o.orderNo || "").toLowerCase();
      const customer = typeof o.customer === "object"
        ? String(o.customer?.name || "").toLowerCase()
        : String(o.customer || "").toLowerCase();
      return orderNo.includes(v) || customer.includes(v);
    });
  }, [orders, search]);

  const handleCompleteOrder = async (order: any) => {
    try {
      const res = await api.post(`/running-orders/closeRunningOrder`, {
        runningOrderId: order.id,
        customerName: typeof order.customer === "object" && order.customer !== null
          ? (order.customer as any)?.name || ""
          : (order.customer as string) || "",
        customerPhone: order.customerPhone,
        paymentMethod: order.paymentMethod || "CASH",
        orderType: order.orderType,
      });
      if (res.data.success) fetchOrders();
    } catch { /* silent */ }
  };

  const handleVoidBill = async (order: any) => {
    if (
      !window.confirm(
        `Void bill ${order.orderNo} for ₹${Number(order.total || 0).toFixed(2)}? This cannot be undone.`,
      )
    )
      return;
    try {
      setVoiding(order.id);
      const res = await cancelBill(order.id);
      if (res.success) {
        fetchOrders();
      } else {
        alert(res.message || "Failed to void bill");
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to void bill");
    } finally {
      setVoiding(null);
    }
  };

  const handleDirectPrint = async (order: any) => {
    const bill: BillData = {
      shopName: user?.restaurant?.name || user?.branch?.name || "Restaurant",
      shopAddress: user?.restaurant?.address || user?.branch?.address,
      shopGstin: user?.restaurant?.gstNumber || user?.branch?.gstNumber,
      billNo: order.orderNo || String(order.id),
      customerName: customerDisplay(order),
      billingType: order.orderType || "DINE_IN",
      paymentMethod: order.paymentMethod || "CASH",
      items: (order.items || []).map((item: any) => ({
        itemName: item.itemName || item.name || "",
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || (Number(item.total) / (Number(item.quantity) || 1)) || 0,
        notes: item.notes || undefined,
        addOns: item.addOns || undefined,
      })),
      subtotal: Number(order.subtotal || order.total || 0),
      discountAmount: Number(order.discountAmount || 0),
      cgst: Number(order.cgst || 0),
      sgst: Number(order.sgst || 0),
      serviceChargeAmount: Number(order.serviceCharge || 0),
      packingCharge: Number(order.packingCharge || 0),
      grandTotal: Number(order.total || 0),
    };
    await printReceipt(bill);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* HEADER */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-3 py-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-base font-black tracking-tight text-gray-900">Order History</h1>
            <p className="text-[10px] text-gray-500">{filteredOrders.length} records</p>
          </div>
          <div className="relative w-full sm:w-48">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order or customer..."
              className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs outline-none transition focus:border-red-300 focus:bg-white" />
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 xl:p-3">
        {/* MOBILE CARDS */}
        <div className="space-y-2 xl:hidden">
          {filteredOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-3xl">📋</span>
              <p className="mt-2 text-sm font-bold text-gray-700">No orders found</p>
            </div>
          )}
          {filteredOrders.map((order) => (
            <div key={`${order.source}-${order.id}`} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-gray-900">{order.orderNo}</p>
                  <p className="text-[10px] text-gray-500">
                    {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : "—"} · {order.table || "—"}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${getTypeBadge(order.orderType)}`}>
                  {order.orderType?.replace("_", " ")}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500">Customer</p>
                  <p className="text-xs font-bold text-gray-900">{customerDisplay(order)}</p>
                </div>
                <p className="text-lg font-black text-red-600">₹{Number(order.total || 0).toFixed(2)}</p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                <div className="flex flex-wrap gap-1">
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${getPayBadge(order.paymentStatus)}`}>
                    {order.paymentStatus || "UNPAID"}
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${getStatusBadge(order.orderStatus)}`}>
                    {order.orderStatus}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDirectPrint(order)}
                    disabled={!canPrint}
                    title={canPrint ? "Print Bill" : "No printer configured"}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${canPrint ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-gray-100 text-gray-300 cursor-not-allowed"}`}>
                    <PrinterIcon className="h-3.5 w-3.5" />
                  </button>
                  {order.orderStatus !== "COMPLETED" && (
                    <button onClick={() => handleCompleteOrder(order)}
                      className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white transition hover:bg-emerald-600">
                      Complete
                    </button>
                  )}
                  {canVoid && order.source === "BILL" && order.paymentStatus !== "CANCELLED" && (
                    <button onClick={() => handleVoidBill(order)}
                      disabled={voiding === order.id}
                      className="rounded-lg bg-red-500 px-2.5 py-1 text-[10px] font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60">
                      {voiding === order.id ? "Voiding…" : "Void"}
                    </button>
                  )}
                </div>
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
                  {["Order", "Time", "Customer", "Type", "Table", "Items", "Payment", "Amount", "Pay Status", "Order Status", "Actions"]
                    .map((h, i) => (
                      <th key={h} className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-500 ${i === 7 ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <tr key={`${order.source}-${order.id}`}
                    className={`border-b border-gray-100 transition hover:bg-red-50/50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                    <td className="px-3 py-2 text-xs font-bold text-gray-800">{order.orderNo}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : "—"}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-900">{customerDisplay(order)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getTypeBadge(order.orderType)}`}>{order.orderType}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{order.table || "—"}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{order.items?.length || 0} items</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{order.paymentMethod || "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <p className="text-sm font-black text-red-600">₹{Number(order.total || 0).toFixed(2)}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getPayBadge(order.paymentStatus)}`}>{order.paymentStatus || "UNPAID"}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(order.orderStatus)}`}>{order.orderStatus}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDirectPrint(order)}
                          disabled={!canPrint}
                          title={canPrint ? "Print Bill" : "No printer configured"}
                          className={`flex h-6 w-6 items-center justify-center rounded-md transition ${canPrint ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-gray-100 text-gray-300 cursor-not-allowed"}`}>
                          <PrinterIcon className="h-3 w-3" />
                        </button>
                        {order.orderStatus !== "COMPLETED" && (
                          <button onClick={() => handleCompleteOrder(order)}
                            className="rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-emerald-600">
                            Complete
                          </button>
                        )}
                        {canVoid && order.source === "BILL" && order.paymentStatus !== "CANCELLED" && (
                          <button onClick={() => handleVoidBill(order)}
                            disabled={voiding === order.id}
                            className="rounded-md bg-red-500 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60">
                            {voiding === order.id ? "Voiding…" : "Void"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-3xl">📋</span>
                <p className="mt-3 text-sm font-bold text-gray-700">No orders found</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
