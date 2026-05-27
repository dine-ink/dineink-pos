import MenuSection from "@/components/billing/MenuSection";
import CartSection from "@/components/billing/CartSection";
import CustomerSection from "@/components/billing/CustomerSection";

import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { saveRunningOrder } from "@/services/runningOrderService";

type Props = {
  step: string;

  setStep: any;

  billingType: string;

  products: any[];

  categories: any[];

  topSellingItems: any[];

  fetchData: any;

  loading: boolean;

  branchData: any;
};
export default function NormalBilling({
  step,
  setStep,
  billingType,
  products,
  categories,
  topSellingItems,
  fetchData,
  loading,
  branchData,
}: Props) {
  const search = "";
  const [selectedCategory, setSelectedCategory] = useState("Best Sellers");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});

  const { user } = useAppSelector((state) => state.auth);
  const filteredProducts =
    selectedCategory === "Best Sellers"
      ? topSellingItems
      : products.filter(
          (product: any) =>
            categories.find((c: any) => c.id === product.categoryId)?.name ===
            selectedCategory,
        );
  const increaseQty = (id: number) => {
    setCart((prev: any) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const decreaseQty = (id: number) => {
    setCart((prev: any) => {
      const current = prev[id] || 0;
      if (current <= 1) {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      }
      return { ...prev, [id]: current - 1 };
    });
  };

  const totalItems: any = Object.values(cart).reduce(
    (acc: any, qty: any) => acc + qty,
    0,
  );

  const cartItems = products.filter((product) => cart[product.id]);

  const grandTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.price * cart[item.id], 0);
  }, [cartItems, cart]);
  const printBill = (billingData: any, items: any[]) => {
    const printWindow = window.open("", "", "width=400,height=800");

    if (!printWindow) return;

    printWindow.document.write(`
  <html>
    <head>
      <title>Print Bill</title>

      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }

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
          overflow: hidden;
          color: black;
        }

        .center {
          text-align: center;
        }

        .divider {
          border-top: 1px dashed black;
          margin: 8px 0;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        td {
          font-size: 11px;
          padding: 3px 0;
          vertical-align: top;
          word-break: break-word;
        }

        .item-name {
          width: 56%;
          padding-right: 4px;
        }

        .qty {
          width: 14%;
          text-align: center;
        }

        .amount {
          width: 30%;
          text-align: right;
        }

        .bill-info td:first-child {
          width: 35%;
        }

        .bill-info td:last-child {
          text-align: right;
        }

        .totals td:first-child {
          width: 65%;
        }

        .totals td:last-child {
          text-align: right;
        }

        .grand-total {
          font-size: 18px;
          font-weight: bold;
        }

        .footer {
          text-align: center;
          margin-top: 12px;
        }

        .footer p {
          margin: 2px 0;
        }

        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          body {
            width: 72mm;
          }

          .bill-container {
            width: 72mm;
            max-width: 72mm;
          }
        }
      </style>
    </head>

    <body onload="window.print(); window.close();">
      <div class="bill-container">

        <!-- ================= HEADER ================= -->

        <div class="center">
          <h2 style="margin:0; font-size:24px;">
            DineInk Restaurant
          </h2>

          <p style="font-size:11px; margin-top:6px;">
            Chennai, Tamil Nadu
          </p>

          <p style="font-size:11px;">
            Phone: +91 9876543210
          </p>

          <p style="font-size:11px;">
            GSTIN: 33ABCDE1234F1Z5
          </p>
        </div>

        <div class="divider"></div>

        <!-- ================= BILL INFO ================= -->

        <table class="bill-info">
          <tr>
            <td>Bill No</td>

            <td>
              BILL-${Date.now()}
            </td>
          </tr>

          <tr>
            <td>Date</td>

            <td>
              ${new Date().toLocaleDateString()}
            </td>
          </tr>

          <tr>
            <td>Time</td>

            <td>
              ${new Date().toLocaleTimeString()}
            </td>
          </tr>

          <tr>
            <td>Customer</td>

            <td>
              ${customerName || "Walk-in"}
            </td>
          </tr>

          <tr>
            <td>Order Type</td>

            <td>
              ${billingType}
            </td>
          </tr>

          <tr>
            <td>Payment</td>

            <td>
              ${billingData.paymentMethod}
            </td>
          </tr>
        </table>

        <div class="divider"></div>

        <!-- ================= ITEMS HEADER ================= -->

        <table>
          <thead>
            <tr>
              <td class="item-name">
                <b>Item</b>
              </td>

              <td class="qty">
                <b>Qty</b>
              </td>

              <td class="amount">
                <b>Amt</b>
              </td>
            </tr>
          </thead>
        </table>

        <div class="divider"></div>

        <!-- ================= ITEMS ================= -->

        <table>
          <tbody>
            ${items
              .map(
                (item: any) => `
                  <tr>
                    <td class="item-name">
                      ${item.itemName}
                    </td>

                    <td class="qty">
                      ${item.quantity}
                    </td>

                    <td class="amount">
                      ₹${(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="divider"></div>

        <!-- ================= TOTALS ================= -->

        <table class="totals">
          <tr>
            <td>Subtotal</td>

            <td>
              ₹${billingData.subtotal.toFixed(2)}
            </td>
          </tr>

          <tr>
            <td>Discount</td>

            <td>
              ₹${billingData.discountAmount.toFixed(2)}
            </td>
          </tr>

          <tr>
            <td>
              CGST
            </td>

            <td>
              ₹${billingData.cgst.toFixed(2)}
            </td>
          </tr>

          <tr>
            <td>
              SGST
            </td>

            <td>
              ₹${billingData.sgst.toFixed(2)}
            </td>
          </tr>

          <tr>
            <td>
              Service Charge
            </td>

            <td>
              ₹${billingData.serviceChargeAmount.toFixed(2)}
            </td>
          </tr>

          ${
            billingData.packingCharge > 0
              ? `
                <tr>
                  <td>
                    Packing Charge
                  </td>

                  <td>
                    ₹${billingData.packingCharge.toFixed(2)}
                  </td>
                </tr>
              `
              : ""
          }

          <tr class="grand-total">
            <td>
              TOTAL
            </td>

            <td>
              ₹${billingData.grandTotal.toFixed(2)}
            </td>
          </tr>
        </table>

        <div class="divider"></div>

        <!-- ================= FOOTER ================= -->

        <div class="footer">
          <p style="font-size:14px; font-weight:bold;">
            Thank You Visit Again!
          </p>

          <p style="font-size:11px;">
            Powered by DineInk POS
          </p>
        </div>

      </div>
    </body>
  </html>
`);

    printWindow.document.close();
  };
  const handleConfirmOrder = async (billingData: any) => {
    try {
      if (!cartItems.length) {
        return;
      }

      const items = cartItems.map((item) => ({
        menuItemId: item.id,

        itemName: item.name,

        quantity: cart[item.id],

        price: item.price,
      }));

      const response = await saveRunningOrder({
        // ================= BASIC =================

        restaurantId: user.restaurantId,

        branchId: user.branchId,

        createdById: user.id,

        orderType: billingType,

        // ================= CUSTOMER =================

        customerName,

        customerPhone,

        customerAddress,

        // ================= PAYMENT =================

        paymentMethod: billingData.paymentMethod,

        // ================= BILLING =================

        subtotal: grandTotal,

        discountAmount: billingData.discountAmount,

        packingCharge: billingData.packingCharge,

        serviceCharge: billingData.serviceChargeAmount,

        gstAmount: billingData.gstAmount,

        cgst: billingData.cgst,

        sgst: billingData.sgst,

        finalAmount: billingData.grandTotal,

        // ================= ITEMS =================

        items,
      });

      if (response.success) {
        printBill(
          {
            ...billingData,
            subtotal: grandTotal,
          },
          items,
        );
        // ================= RESET =================

        setCart({});

        setCustomerName("");

        setCustomerPhone("");

        setCustomerAddress("");

        setStep("MENU");
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col overflow-hidden px-1 py-2 xl:py-3">
      {/* ================= MENU ================= */}
      {step === "MENU" && (
        <div className="flex h-full min-h-0 flex-col overflow-hidden xl:flex-row xl:gap-3">
          {/* ================= LEFT ================= */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-hidden pb-[145px] xl:pb-0">
              <MenuSection
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                filteredProducts={filteredProducts}
                activeCart={cart}
                increaseQty={increaseQty}
                decreaseQty={decreaseQty}
              />
            </div>
          </div>
          {/* ================= MOBILE BOTTOM ================= */}
          <div className="absolute bottom-4 left-1 right-1 rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] xl:hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Items</p>
                <h2 className="text-xl font-black text-red-600">
                  {totalItems}
                </h2>
                <p className="mt-1 text-xs text-gray-500">₹{grandTotal}</p>
              </div>
              <button
                onClick={() => setStep("CART")}
                className="rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg"
              >
                View Cart
              </button>
            </div>
          </div>
          {/* ================= DESKTOP CART ================= */}
          <div className="hidden xl:flex xl:w-[320px] 2xl:w-[340px] xl:flex-col">
            <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
              {/* HEADER */}
              <div className="border-b border-gray-100 p-4">
                <h2 className="text-2xl font-black text-gray-900">
                  Current Order
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Quick billing summary
                </p>
              </div>
              {/* ITEMS */}
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {cartItems.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                      <p className="text-sm text-gray-500">No items added</p>
                    </div>
                  )}
                  {cartItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {item.name}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500">
                            Qty: {cart[item.id]}
                          </p>
                        </div>
                        <p className="text-base font-black text-red-600">
                          ₹{item.price * cart[item.id]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* FOOTER */}
              <div className="border-t border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total</p>
                    <h2 className="text-2xl font-black text-red-600">
                      ₹{grandTotal}
                    </h2>
                  </div>
                  <button
                    onClick={() => setStep("CART")}
                    className="rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg"
                  >
                    View Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ================= CART ================= */}
      {step === "CART" && (
        <CartSection
          cartItems={cartItems}
          activeCart={cart}
          grandTotal={grandTotal}
          totalItems={totalItems}
          increaseQty={increaseQty}
          decreaseQty={decreaseQty}
          setStep={setStep}
        />
      )}
      {/* ================= CUSTOMER ================= */}
      {step === "CUSTOMER" && (
        <CustomerSection
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          customerAddress={customerAddress}
          setCustomerAddress={setCustomerAddress}
          grand_Total={grandTotal}
          billingType={billingType}
          setStep={setStep}
          onConfirm={handleConfirmOrder}
          billing={branchData.billing}
        />
      )}
    </div>
  );
}
