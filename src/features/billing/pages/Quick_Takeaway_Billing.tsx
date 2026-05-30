import MenuSection from "@/components/billing/MenuSection";
import CartSection from "@/components/billing/CartSection";
import CustomerSection from "@/components/billing/CustomerSection";
import { useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { saveRunningOrder } from "@/services/runningOrderService";
import { PauseCircle, Play } from "lucide-react";

type HeldOrder = {
  id: string;
  cart: Record<number, number>;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  itemCount: number;
  label: string;
};

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
  branchData,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState("Best Sellers");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const { user } = useAppSelector((state) => state.auth);

  const holdCurrentOrder = () => {
    if (!Object.keys(cart).length) return;
    const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);
    const newHeld: HeldOrder = {
      id: Date.now().toString(),
      cart,
      customerName,
      customerPhone,
      customerAddress,
      itemCount,
      label: customerName.trim() || `Order #${heldOrders.length + 1}`,
    };
    setHeldOrders((prev) => [...prev, newHeld]);
    setCart({});
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setStep("MENU");
  };

  const resumeHeldOrder = (held: HeldOrder) => {
    // if current cart has items, push it to hold first
    if (Object.keys(cart).length) {
      const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);
      const currentAsHeld: HeldOrder = {
        id: Date.now().toString(),
        cart,
        customerName,
        customerPhone,
        customerAddress,
        itemCount,
        label: customerName.trim() || `Order #${heldOrders.length + 1}`,
      };
      setHeldOrders((prev) => [...prev.filter((h) => h.id !== held.id), currentAsHeld]);
    } else {
      setHeldOrders((prev) => prev.filter((h) => h.id !== held.id));
    }
    setCart(held.cart);
    setCustomerName(held.customerName);
    setCustomerPhone(held.customerPhone);
    setCustomerAddress(held.customerAddress);
    setStep("MENU");
  };

  const discardHeldOrder = (id: string) =>
    setHeldOrders((prev) => prev.filter((h) => h.id !== id));

  const filteredProducts =
    selectedCategory === "Best Sellers"
      ? topSellingItems
      : products.filter(
          (p: any) =>
            categories.find((c: any) => c.id === p.categoryId)?.name ===
            selectedCategory,
        );

  const increaseQty = (id: number) =>
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));

  const decreaseQty = (id: number) =>
    setCart((prev) => {
      if ((prev[id] || 0) <= 1) {
        const u = { ...prev };
        delete u[id];
        return u;
      }
      return { ...prev, [id]: prev[id] - 1 };
    });

  const totalItems = Object.values(cart).reduce((acc, qty) => acc + qty, 0);
  const cartItems = products.filter((p) => cart[p.id]);
  const grandTotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.price * cart[item.id], 0),
    [cartItems, cart],
  );

  const printBill = (billingData: any, items: any[]) => {
    const printWindow = window.open("", "", "width=400,height=800");
    if (!printWindow) return;
    printWindow.document.write(`
<html><head><title>Print Bill</title>
<style>
@page{size:80mm auto;margin:0}body{margin:0;padding:0;font-family:monospace;background:white}
.bill-container{width:72mm;max-width:72mm;margin:0 auto;padding:4px;box-sizing:border-box;color:black}
.center{text-align:center}.divider{border-top:1px dashed black;margin:8px 0}
table{width:100%;border-collapse:collapse;table-layout:fixed}
td{font-size:11px;padding:3px 0;vertical-align:top;word-break:break-word}
.item-name{width:56%;padding-right:4px}.qty{width:14%;text-align:center}.amount{width:30%;text-align:right}
.bill-info td:first-child{width:35%}.bill-info td:last-child{text-align:right}
.totals td:first-child{width:65%}.totals td:last-child{text-align:right}
.grand-total{font-size:18px;font-weight:bold}.footer{text-align:center;margin-top:12px}.footer p{margin:2px 0}
@media print{@page{size:80mm auto;margin:0}body{width:72mm}.bill-container{width:72mm;max-width:72mm}}
</style></head>
<body onload="window.print();window.close();">
<div class="bill-container">
<div class="center"><h2 style="margin:0;font-size:24px;">KD Kari</h2><p style="font-size:11px;margin-top:6px;">Kondapur, Hyderabad</p><p style="font-size:11px;">GSTIN: 33ABCDE1234F1Z5</p></div>
<div class="divider"></div>
<table class="bill-info">
<tr><td>Bill No</td><td>BILL-${Date.now()}</td></tr>
<tr><td>Date</td><td>${new Date().toLocaleDateString()}</td></tr>
<tr><td>Time</td><td>${new Date().toLocaleTimeString()}</td></tr>
<tr><td>Customer</td><td>${customerName || "Walk-in"}</td></tr>
<tr><td>Order Type</td><td>${billingType}</td></tr>
<tr><td>Payment</td><td>${billingData.paymentMethod}</td></tr>
</table>
<div class="divider"></div>
<table><thead><tr><td class="item-name"><b>Item</b></td><td class="qty"><b>Qty</b></td><td class="amount"><b>Amt</b></td></tr></thead></table>
<div class="divider"></div>
<table><tbody>${items.map((item: any) => `<tr><td class="item-name">${item.itemName}</td><td class="qty">${item.quantity}</td><td class="amount">₹${(item.price * item.quantity).toFixed(2)}</td></tr>`).join("")}</tbody></table>
<div class="divider"></div>
<table class="totals">
<tr><td>Subtotal</td><td>₹${billingData.subtotal.toFixed(2)}</td></tr>
<tr><td>Discount</td><td>₹${billingData.discountAmount.toFixed(2)}</td></tr>
<tr><td>CGST</td><td>₹${billingData.cgst.toFixed(2)}</td></tr>
<tr><td>SGST</td><td>₹${billingData.sgst.toFixed(2)}</td></tr>
<tr><td>Service Charge</td><td>₹${billingData.serviceChargeAmount.toFixed(2)}</td></tr>
${billingData.packingCharge > 0 ? `<tr><td>Packing Charge</td><td>₹${billingData.packingCharge.toFixed(2)}</td></tr>` : ""}
<tr class="grand-total"><td>TOTAL</td><td>₹${billingData.grandTotal.toFixed(2)}</td></tr>
</table>
<div class="divider"></div>
<div class="footer"><p style="font-size:14px;font-weight:bold;">Thank You Visit Again!</p><p style="font-size:11px;">Powered by DineInk POS</p></div>
</div></body></html>`);
    printWindow.document.close();
  };

  const handleConfirmOrder = async (billingData: any) => {
    if (!cartItems.length) return;
    const items = cartItems.map((item) => ({
      menuItemId: item.id,
      itemName: item.name,
      quantity: cart[item.id],
      price: item.price,
    }));
    const response = await saveRunningOrder({
      restaurantId: user.restaurantId,
      branchId: user.branchId,
      createdById: user.id,
      orderType: billingType,
      customerName,
      customerPhone,
      customerAddress,
      paymentMethod: billingData.paymentMethod,
      subtotal: grandTotal,
      discountAmount: billingData.discountAmount,
      packingCharge: billingData.packingCharge,
      serviceCharge: billingData.serviceChargeAmount,
      gstAmount: billingData.gstAmount,
      cgst: billingData.cgst,
      sgst: billingData.sgst,
      finalAmount: billingData.grandTotal,
      items,
    });
    if (response.success) {
      printBill({ ...billingData, subtotal: grandTotal }, items);
      setCart({});
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setStep("MENU");
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* MENU STEP */}
      {step === "MENU" && (
        <div className="flex h-full flex-col overflow-hidden xl:flex-row xl:gap-2">
          {/* LEFT — MENU */}
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">

            {/* ON HOLD STRIP */}
            {heldOrders.length > 0 && (
              <div className="shrink-0 mb-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <div className="flex shrink-0 items-center gap-1 text-amber-700">
                    <PauseCircle className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-wide">
                      On Hold ({heldOrders.length})
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {heldOrders.map((held) => (
                      <div key={held.id} className="flex shrink-0 items-center gap-1 rounded-lg border border-amber-300 bg-white pl-2.5 pr-1 py-1 shadow-sm">
                        <button
                          onClick={() => resumeHeldOrder(held)}
                          className="flex items-center gap-1.5"
                        >
                          <Play className="h-3 w-3 text-amber-600" />
                          <span className="max-w-[80px] truncate text-[11px] font-black text-gray-900">
                            {held.label}
                          </span>
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                            {held.itemCount} items
                          </span>
                        </button>
                        <button
                          onClick={() => discardHeldOrder(held.id)}
                          className="ml-1 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <span className="text-[10px] font-black">×</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-hidden">
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

            {/* Mobile bottom action bar */}
            <div className="xl:hidden shrink-0 mt-1.5 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                    {billingType === "TAKE_AWAY" ? "Takeaway" : "Quick Bill"}
                  </p>
                  <p className="text-sm font-black text-gray-900">
                    {totalItems} items ·{" "}
                    <span className="text-red-600">₹{grandTotal}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {cartItems.length > 0 && (
                    <button
                      onClick={holdCurrentOrder}
                      className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 shadow-sm"
                    >
                      <PauseCircle className="h-3.5 w-3.5" />
                      Hold
                    </button>
                  )}
                  <button
                    onClick={() => setStep("CART")}
                    disabled={!cartItems.length}
                    className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                  >
                    View Cart
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — DESKTOP CART PANEL */}
          <div className="hidden xl:flex xl:w-[240px] xl:shrink-0 xl:flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="shrink-0 border-b border-gray-100 px-3 py-2.5">
              <h3 className="text-sm font-black text-gray-900">
                Current Order
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {billingType === "TAKE_AWAY" ? "Takeaway" : "Quick Billing"}
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
              {cartItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 p-6 text-center">
                  <span className="text-2xl">🛒</span>
                  <p className="mt-2 text-xs font-bold text-gray-500">
                    No items yet
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {cartItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-gray-900">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          × {cart[item.id]}
                        </p>
                      </div>
                      <p className="ml-2 shrink-0 text-xs font-black text-red-600">
                        ₹{item.price * cart[item.id]}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 border-t border-gray-100 p-2.5 space-y-2">
              {cartItems.length > 0 && (
                <button
                  onClick={holdCurrentOrder}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 py-1.5 text-[11px] font-bold text-amber-700 transition hover:bg-amber-100"
                >
                  <PauseCircle className="h-3.5 w-3.5" />
                  Hold Order
                </button>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500">Total</p>
                  <p className="text-lg font-black text-red-600">
                    ₹{grandTotal}
                  </p>
                </div>
                <button
                  onClick={() => setStep("CART")}
                  disabled={!cartItems.length}
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-red-600 disabled:opacity-50"
                >
                  View Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {step === "CART" && (
        <CartSection
          cartItems={cartItems}
          activeCart={cart}
          grandTotal={grandTotal}
          totalItems={totalItems}
          increaseQty={increaseQty}
          decreaseQty={decreaseQty}
          setStep={setStep}
          onHold={holdCurrentOrder}
        />
      )}
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
