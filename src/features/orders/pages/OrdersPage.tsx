import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  MagnifyingGlassIcon,
  PrinterIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

export default function OrderHistory() {
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const { user } = useAppSelector((state) => state.auth);

  const fetchOrders = async () => {
    try {
      const res = await fetch(
        `https://dineink-backend.onrender.com/api/bills/${user.restaurantId}/${user.branchId}/branchwise`,
      );
      const json = await res.json();
      if (json.success) setOrders(json.bills || []);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (user?.restaurantId) fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const v = search.toLowerCase();
    const orderNo = String(order.orderNo || "").toLowerCase();
    const customer =
      typeof order.customer === "object"
        ? String(order.customer?.name || "").toLowerCase()
        : String(order.customer || "").toLowerCase();
    return orderNo.includes(v) || customer.includes(v);
  });

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      DINE_IN: "bg-blue-100 text-blue-700",
      SWIGGY: "bg-orange-100 text-orange-700",
      ZOMATO: "bg-red-100 text-red-700",
      TAKE_AWAY: "bg-purple-100 text-purple-700",
    };
    return styles[type] || "bg-gray-100 text-gray-700";
  };

  const getPaymentStatusBadge = (status: string) => {
    if (status === "PAID") return "bg-emerald-100 text-emerald-700";
    if (status === "PARTIAL") return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const getOrderStatusBadge = (status: string) => {
    if (status === "COMPLETED") return "bg-emerald-100 text-emerald-700";
    if (status === "READY") return "bg-blue-100 text-blue-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const handleCompleteOrder = async (order: any) => {
    try {
      const res = await fetch(
        `https://dineink-backend.onrender.com/api/running-orders/closeRunningOrder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
      if (json.success) fetchOrders();
    } catch (error) {
      console.log(error);
    }
  };

  const handlePrint = () => {
    const printContents = document.getElementById("thermal-bill")?.innerHTML;
    const printWindow = window.open("", "", "width=400,height=800");
    if (printWindow && printContents) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Bill</title>
            <style>
              body { margin:0; padding:0; font-family:monospace; background:white; }
              .bill-container { width:72mm; max-width:72mm; margin:0 auto; padding:4px; box-sizing:border-box; color:black; }
              .text-center { text-align:center; }
              .flex { display:flex; justify-content:space-between; }
              .items-row { display:flex; margin-bottom:6px; }
              .item-name { flex:1; padding-right:8px; }
              .qty { width:40px; text-align:center; }
              .amt { width:70px; text-align:right; }
              .divider { border-top:1px dashed black; margin:8px 0; }
              @media print { @page { size:80mm auto; margin:0; } body { margin:0; padding:0; width:72mm; } .bill-container { width:72mm; max-width:72mm; padding:4px; margin:0 auto; } }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="bill-container">${printContents}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const customerDisplay = (order: any) =>
    typeof order.customer === "object"
      ? order.customer?.name || "Walk-in"
      : order.customer || "Walk-in";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* HEADER */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900">
              Order History
            </h1>
            <p className="mt-0.5 text-xs text-gray-500">
              {filteredOrders.length} completed records
            </p>
          </div>
          <div className="relative w-full sm:w-56">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order or customer..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition focus:border-red-300 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 xl:p-4">
        {/* ===== MOBILE: CARD LIST ===== */}
        <div className="space-y-2.5 xl:hidden">
          {filteredOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl">📋</span>
              <p className="mt-3 text-base font-bold text-gray-700">
                No orders found
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {search ? "Try a different search" : "Orders will appear here"}
              </p>
            </div>
          )}
          {filteredOrders.map((order) => (
            <div
              key={`${order.source}-${order.id}`}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              {/* TOP ROW */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-gray-900">
                    {order.orderNo}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleTimeString()} ·{" "}
                    {order.table || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${getTypeBadge(order.orderType)}`}
                  >
                    {order.orderType?.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* MIDDLE ROW */}
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="text-sm font-bold text-gray-900">
                    {customerDisplay(order)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-xl font-black text-red-600">
                    ₹{Number(order.total || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* BOTTOM ROW */}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${getPaymentStatusBadge(order.paymentStatus)}`}
                  >
                    {order.paymentStatus || "UNPAID"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${getOrderStatusBadge(order.orderStatus)}`}
                  >
                    {order.orderStatus}
                  </span>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-700">
                    {order.paymentMethod || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedBill(order);
                      setShowPrintPreview(true);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"
                  >
                    <PrinterIcon className="h-4 w-4" />
                  </button>
                  {order.orderStatus !== "COMPLETED" && (
                    <button
                      onClick={() => handleCompleteOrder(order)}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-emerald-600"
                    >
                      Complete
                    </button>
                  )}
                </div>
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
                    "Time",
                    "Customer",
                    "Type",
                    "Table",
                    "Items",
                    "Payment",
                    "Amount",
                    "Pay Status",
                    "Order Status",
                    "Actions",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[11px] font-black uppercase tracking-wider text-gray-500 ${
                        i === 7 ? "text-right" : "text-left"
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
                    key={`${order.source}-${order.id}`}
                    className={`border-b border-gray-100 transition hover:bg-red-50/50 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-800">{order.orderNo}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">
                        {customerDisplay(order)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${getTypeBadge(order.orderType)}`}
                      >
                        {order.orderType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {order.table || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {order.items?.length || 0} items
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">
                        {order.paymentMethod || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-lg font-black text-red-600">
                        ₹{Number(order.total || 0).toFixed(2)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${getPaymentStatusBadge(order.paymentStatus)}`}
                      >
                        {order.paymentStatus || "UNPAID"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${getOrderStatusBadge(order.orderStatus)}`}
                      >
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedBill(order);
                            setShowPrintPreview(true);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </button>
                        {order.orderStatus !== "COMPLETED" && (
                          <button
                            onClick={() => handleCompleteOrder(order)}
                            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-600"
                          >
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
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-4xl">📋</span>
                <p className="mt-4 text-lg font-bold text-gray-700">
                  No orders found
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {search ? "Try a different search" : "Orders will appear here"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PRINT PREVIEW MODAL */}
      {showPrintPreview && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[95vh] w-full max-w-sm overflow-auto rounded-3xl bg-white shadow-2xl">
            <button
              onClick={() => setShowPrintPreview(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200"
            >
              <XMarkIcon className="h-5 w-5 text-gray-700" />
            </button>

            <div className="p-5">
              <h3 className="text-base font-black text-gray-900">
                Print Preview
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                {selectedBill.orderNo}
              </p>
            </div>

            <div
              id="thermal-bill"
              className="mx-auto bg-white px-2 pb-4 text-black"
              style={{
                width: "100%",
                maxWidth: "72mm",
                fontFamily: "monospace",
                fontSize: "12px",
                lineHeight: "1.4",
              }}
            >
              <div className="text-center">
                <h1 style={{ fontSize: "20px", fontWeight: "900" }}>
                  DINEINK RESTAURANT
                </h1>
                <p style={{ fontSize: "11px", marginTop: "4px" }}>
                  Chennai, Tamil Nadu
                </p>
                <p style={{ fontSize: "11px" }}>Phone: +91 9876543210</p>
                <p style={{ fontSize: "11px" }}>GSTIN: 33ABCDE1234F1Z5</p>
              </div>
              <div style={{ borderTop: "1px dashed black", margin: "10px 0" }} />
              <div style={{ fontSize: "12px" }}>
                {[
                  ["Bill No", selectedBill.orderNo],
                  [
                    "Date",
                    new Date(selectedBill.createdAt).toLocaleDateString(),
                  ],
                  [
                    "Time",
                    new Date(selectedBill.createdAt).toLocaleTimeString(),
                  ],
                  ["Customer", customerDisplay(selectedBill)],
                  ["Order Type", selectedBill.orderType],
                  ["Payment", selectedBill.paymentMethod],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "4px",
                    }}
                  >
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px dashed black", margin: "10px 0" }} />
              <div
                style={{
                  display: "flex",
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              >
                <div style={{ flex: 1 }}>Item</div>
                <div style={{ width: "40px", textAlign: "center" }}>Qty</div>
                <div style={{ width: "55px", textAlign: "right" }}>Amount</div>
              </div>
              <div style={{ borderTop: "1px dashed black", margin: "6px 0 10px" }} />
              <div>
                {selectedBill.items?.map((item: any) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      marginBottom: "10px",
                      fontSize: "12px",
                    }}
                  >
                    <div
                      style={{ flex: 1, paddingRight: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {item.itemName}
                    </div>
                    <div style={{ width: "32px", textAlign: "center" }}>
                      {item.quantity}
                    </div>
                    <div style={{ width: "55px", textAlign: "right" }}>
                      ₹{Number(item.total || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px dashed black", margin: "10px 0" }} />
              <div style={{ fontSize: "13px" }}>
                {[
                  ["Subtotal", `₹${Number(selectedBill.total || 0).toFixed(2)}`],
                  ["CGST", "₹0.00"],
                  ["SGST", "₹0.00"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "5px",
                    }}
                  >
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px dashed black", margin: "10px 0" }} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "900",
                  fontSize: "18px",
                }}
              >
                <span>TOTAL</span>
                <span>₹{Number(selectedBill.total || 0).toFixed(2)}</span>
              </div>
              <div style={{ borderTop: "1px dashed black", margin: "10px 0" }} />
              <div className="text-center">
                <p style={{ fontSize: "14px", fontWeight: "bold" }}>
                  Thank You Visit Again!
                </p>
                <p style={{ marginTop: "4px", fontSize: "11px" }}>
                  Powered by DineInk POS
                </p>
              </div>
            </div>

            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setShowPrintPreview(false)}
                className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
