import { useEffect, useState } from "react";

import { useAppSelector } from "@/store/hooks";

import {
  MagnifyingGlassIcon,
  EyeIcon,
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

      case "TAKE_AWAY":
        return "bg-purple-100 text-purple-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleCompleteOrder = async (order: any) => {
    try {
      const res = await fetch(
        `https://dineink-backend.onrender.com/api/running-orders/closeRunningOrder`,
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

  const handlePrint = () => {
    const printContents = document.getElementById("thermal-bill")?.innerHTML;

    const printWindow = window.open("", "", "width=400,height=800");

    if (printWindow && printContents) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Bill</title>

            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: monospace;
                background: white;
              }
              .bill-container {
                width: 72mm;
                max-width: 72mm;
                margin: 0 auto;
                padding: 4px;
                box-sizing: border-box;
                color: black;
              }

              .text-center {
                text-align: center;
              }

              .flex {
                display: flex;
                justify-content: space-between;
              }

              .items-row {
                display: flex;
                margin-bottom: 6px;
              }

              .item-name {
                flex: 1;
                padding-right: 8px;
              }

              .qty {
                width: 40px;
                text-align: center;
              }

              .amt {
                width: 70px;
                text-align: right;
              }

              .divider {
                border-top: 1px dashed black;
                margin: 8px 0;
              }

              @media print {

                @page {
                  size: 80mm auto;
                  margin: 0;
                }

                body {
                  margin: 0;
                  padding: 0;
                  width: 72mm;
                }

                .bill-container {
                  width: 72mm;
                  max-width: 72mm;
                  padding: 4px;
                  margin: 0 auto;
                }
              }
            </style>
          </head>

          <body onload="window.print(); window.close();">
            <div class="bill-container">
              ${printContents}
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
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
                        order.paymentStatus === "PAID"
                          ? "bg-green-100 text-green-700"
                          : order.paymentStatus === "PARTIAL"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {order.paymentStatus || "UNPAID"}
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

                      <button
                        onClick={() => {
                          setSelectedBill(order);

                          setShowPrintPreview(true);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"
                      >
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

      {/* ================= PRINT PREVIEW ================= */}

      {showPrintPreview && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative max-h-[95vh] overflow-auto rounded-3xl bg-white p-5 shadow-2xl">
            {/* CLOSE */}

            <button
              onClick={() => setShowPrintPreview(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <XMarkIcon className="h-5 w-5 text-gray-700" />
            </button>

            {/* BILL */}

            <div
              id="thermal-bill"
              className="mx-auto bg-white text-black"
              style={{
                width: "100%",
                maxWidth: "72mm",
                padding: "4px",
                boxSizing: "border-box",
                fontFamily: "monospace",
                fontSize: "12px",
                lineHeight: "1.4",
              }}
            >
              {/* ================= HEADER ================= */}

              <div className="text-center">
                <h1
                  style={{
                    fontSize: "20px",
                    fontWeight: "900",
                    letterSpacing: "1px",
                  }}
                >
                  DINEINK RESTAURANT
                </h1>

                <p style={{ fontSize: "11px", marginTop: "4px" }}>
                  Chennai, Tamil Nadu
                </p>

                <p style={{ fontSize: "11px" }}>Phone: +91 9876543210</p>

                <p style={{ fontSize: "11px" }}>GSTIN: 33ABCDE1234F1Z5</p>
              </div>

              {/* DIVIDER */}

              <div
                style={{
                  borderTop: "1px dashed black",
                  margin: "10px 0",
                }}
              />

              {/* ================= BILL INFO ================= */}

              <div style={{ fontSize: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Bill No</span>

                  <span>{selectedBill.orderNo}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "4px",
                  }}
                >
                  <span>Date</span>

                  <span>
                    {new Date(selectedBill.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "4px",
                  }}
                >
                  <span>Time</span>

                  <span>
                    {new Date(selectedBill.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "4px",
                  }}
                >
                  <span>Customer</span>

                  <span>
                    {typeof selectedBill.customer === "object"
                      ? selectedBill.customer?.name
                      : selectedBill.customer || "Walk-in"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "4px",
                  }}
                >
                  <span>Order Type</span>

                  <span>{selectedBill.orderType}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "4px",
                  }}
                >
                  <span>Payment</span>

                  <span>{selectedBill.paymentMethod}</span>
                </div>
              </div>

              {/* DIVIDER */}

              <div
                style={{
                  borderTop: "1px dashed black",
                  margin: "10px 0",
                }}
              />

              {/* ================= ITEMS HEADER ================= */}

              <div
                style={{
                  display: "flex",
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              >
                <div style={{ flex: 1 }}>Item</div>

                <div
                  style={{
                    width: "40px",
                    textAlign: "center",
                  }}
                >
                  Qty
                </div>

                <div
                  style={{
                    width: "55px",
                    textAlign: "right",
                  }}
                >
                  Amount
                </div>
              </div>

              {/* DIVIDER */}

              <div
                style={{
                  borderTop: "1px dashed black",
                  margin: "6px 0 10px",
                }}
              />

              {/* ================= ITEMS ================= */}

              <div>
                {selectedBill.items?.map((item: any) => (
                  <div
                    key={item.id}
                    style={{
                      marginBottom: "10px",
                      fontSize: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          paddingRight: "6px",
                          wordBreak: "break-word",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.itemName}
                      </div>

                      <div
                        style={{
                          width: "32px",
                          textAlign: "center",
                        }}
                      >
                        {item.quantity}
                      </div>

                      <div
                        style={{
                          width: "55px",
                          textAlign: "right",
                        }}
                      >
                        ₹{Number(item.total || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DIVIDER */}

              <div
                style={{
                  borderTop: "1px dashed black",
                  margin: "10px 0",
                }}
              />

              {/* ================= TOTALS ================= */}

              <div style={{ fontSize: "13px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span>Subtotal</span>

                  <span>₹{Number(selectedBill.total || 0).toFixed(2)}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span>CGST</span>

                  <span>₹0.00</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span>SGST</span>

                  <span>₹0.00</span>
                </div>
              </div>

              {/* DIVIDER */}

              <div
                style={{
                  borderTop: "1px dashed black",
                  margin: "10px 0",
                }}
              />

              {/* ================= GRAND TOTAL ================= */}

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

              {/* DIVIDER */}

              <div
                style={{
                  borderTop: "1px dashed black",
                  margin: "10px 0",
                }}
              />

              {/* ================= FOOTER ================= */}

              <div className="text-center">
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  Thank You Visit Again!
                </p>

                <p
                  style={{
                    marginTop: "4px",
                    fontSize: "11px",
                  }}
                >
                  Powered by DineInk POS
                </p>
              </div>
            </div>

            {/* BUTTONS */}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowPrintPreview(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold"
              >
                Close
              </button>

              <button
                onClick={handlePrint}
                className="rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700"
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
