import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { MagnifyingGlassIcon, PrinterIcon, XMarkIcon } from "@heroicons/react/24/solid";
import PageLoader from "@/components/ui/PageLoader";
import { api } from "@/services/api";

const TYPE_BADGE: Record<string, string> = {
  DINE_IN: "bg-blue-100 text-blue-700",
  SWIGGY: "bg-orange-100 text-orange-700",
  ZOMATO: "bg-red-100 text-red-700",
  TAKE_AWAY: "bg-purple-100 text-purple-700",
};
const getTypeBadge = (t: string) => TYPE_BADGE[t] || "bg-gray-100 text-gray-700";
const getPayBadge = (s: string) =>
  s === "PAID" ? "bg-emerald-100 text-emerald-700" : s === "PARTIAL" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
const getStatusBadge = (s: string) =>
  s === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : s === "READY" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700";
const customerDisplay = (order: any) =>
  typeof order.customer === "object" ? order.customer?.name || "Walk-in" : order.customer || "Walk-in";

export default function OrderHistory() {
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const { user } = useAppSelector((state) => state.auth);

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
    if (user?.restaurantId) fetchOrders();
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
        customerName: order.customer,
        customerPhone: order.customerPhone,
        paymentMethod: order.paymentMethod || "CASH",
        orderType: order.orderType,
      });
      if (res.data.success) fetchOrders();
    } catch { /* silent */ }
  };

  const handlePrint = () => {
    const printContents = document.getElementById("thermal-bill")?.innerHTML;
    const printWindow = window.open("", "", "width=400,height=800");
    if (printWindow && printContents) {
      printWindow.document.write(`
        <html><head><title>Print Bill</title>
        <style>
          body{margin:0;padding:0;font-family:monospace;background:white}
          .bill-container{width:72mm;max-width:72mm;margin:0 auto;padding:4px;box-sizing:border-box;color:black}
          .text-center{text-align:center}.flex{display:flex;justify-content:space-between}
          .items-row{display:flex;margin-bottom:6px}.item-name{flex:1;padding-right:8px}
          .qty{width:40px;text-align:center}.amt{width:70px;text-align:right}
          .divider{border-top:1px dashed black;margin:8px 0}
          @media print{@page{size:80mm auto;margin:0}body{margin:0;padding:0;width:72mm}.bill-container{width:72mm;max-width:72mm;padding:4px;margin:0 auto}}
        </style></head>
        <body onload="window.print();window.close();">
          <div class="bill-container">${printContents}</div>
        </body></html>
      `);
      printWindow.document.close();
    }
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
                  <button onClick={() => { setSelectedBill(order); setShowPrintPreview(true); }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100">
                    <PrinterIcon className="h-3.5 w-3.5" />
                  </button>
                  {order.orderStatus !== "COMPLETED" && (
                    <button onClick={() => handleCompleteOrder(order)}
                      className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white transition hover:bg-emerald-600">
                      Complete
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
                        <button onClick={() => { setSelectedBill(order); setShowPrintPreview(true); }}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-red-50 text-red-600 transition hover:bg-red-100">
                          <PrinterIcon className="h-3 w-3" />
                        </button>
                        {order.orderStatus !== "COMPLETED" && (
                          <button onClick={() => handleCompleteOrder(order)}
                            className="rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-emerald-600">
                            Complete
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

      {/* PRINT PREVIEW */}
      {showPrintPreview && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[95vh] w-full max-w-xs overflow-auto rounded-2xl bg-white shadow-2xl">
            <button onClick={() => setShowPrintPreview(false)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200">
              <XMarkIcon className="h-4 w-4 text-gray-700" />
            </button>
            <div className="px-4 pt-4 pb-2">
              <p className="text-sm font-black text-gray-900">Print Preview</p>
              <p className="text-[10px] text-gray-500">{selectedBill.orderNo}</p>
            </div>
            <div id="thermal-bill" className="mx-auto bg-white px-2 pb-3 text-black"
              style={{ width: "100%", maxWidth: "72mm", fontFamily: "monospace", fontSize: "12px", lineHeight: "1.4" }}>
              <div className="text-center">
                <h1 style={{ fontSize: "18px", fontWeight: "900" }}>{user?.restaurant?.name || user?.branch?.name || "Restaurant"}</h1>
                {(user?.restaurant?.address || user?.branch?.address) && <p style={{ fontSize: "10px", marginTop: "3px" }}>{user?.restaurant?.address || user?.branch?.address}</p>}
                {(user?.restaurant?.phone || user?.branch?.phone) && <p style={{ fontSize: "10px" }}>Phone: {user?.restaurant?.phone || user?.branch?.phone}</p>}
                {(user?.restaurant?.gstNumber || user?.branch?.gstNumber) && <p style={{ fontSize: "10px" }}>GSTIN: {user?.restaurant?.gstNumber || user?.branch?.gstNumber}</p>}
              </div>
              <div style={{ borderTop: "1px dashed black", margin: "8px 0" }} />
              <div style={{ fontSize: "11px" }}>
                {[["Bill No", selectedBill.orderNo], ["Date", new Date(selectedBill.createdAt).toLocaleDateString()],
                  ["Time", new Date(selectedBill.createdAt).toLocaleTimeString()], ["Customer", customerDisplay(selectedBill)],
                  ["Order Type", selectedBill.orderType], ["Payment", selectedBill.paymentMethod]].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
                    <span>{l}</span><span>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px dashed black", margin: "8px 0" }} />
              <div style={{ display: "flex", fontWeight: "bold", fontSize: "11px" }}>
                <div style={{ flex: 1 }}>Item</div>
                <div style={{ width: "36px", textAlign: "center" }}>Qty</div>
                <div style={{ width: "52px", textAlign: "right" }}>Amount</div>
              </div>
              <div style={{ borderTop: "1px dashed black", margin: "5px 0 8px" }} />
              <div>
                {selectedBill.items?.map((item: any) => (
                  <div key={item.id} style={{ display: "flex", marginBottom: "8px", fontSize: "11px" }}>
                    <div style={{ flex: 1, paddingRight: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.itemName}</div>
                    <div style={{ width: "30px", textAlign: "center" }}>{item.quantity}</div>
                    <div style={{ width: "52px", textAlign: "right" }}>₹{Number(item.total || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px dashed black", margin: "8px 0" }} />
              {[["Subtotal", `₹${Number(selectedBill.subtotal || selectedBill.total || 0).toFixed(2)}`], ["CGST", `₹${Number(selectedBill.cgst || 0).toFixed(2)}`], ["SGST", `₹${Number(selectedBill.sgst || 0).toFixed(2)}`]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                  <span>{l}</span><span>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px dashed black", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: "16px" }}>
                <span>TOTAL</span><span>₹{Number(selectedBill.total || 0).toFixed(2)}</span>
              </div>
              <div style={{ borderTop: "1px dashed black", margin: "8px 0" }} />
              <div className="text-center">
                <p style={{ fontSize: "13px", fontWeight: "bold" }}>Thank You Visit Again!</p>
                <p style={{ marginTop: "3px", fontSize: "10px" }}>Powered by DineInk POS</p>
              </div>
            </div>
            <div className="flex gap-2 px-4 pb-4">
              <button onClick={() => setShowPrintPreview(false)}
                className="flex-1 rounded-xl border border-gray-300 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50">
                Close
              </button>
              <button onClick={handlePrint}
                className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-bold text-white transition hover:bg-red-700">
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
