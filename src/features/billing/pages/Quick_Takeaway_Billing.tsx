import MenuSection from "@/components/billing/MenuSection";
import CartSection from "@/components/billing/CartSection";
import CustomerSection from "@/components/billing/CustomerSection";
import { useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { saveRunningOrder, closeRunningOrder } from "@/services/runningOrderService";
import { PauseCircle, Play } from "lucide-react";
import { printReceipt } from "@/utils/printer";

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
  const [submitting, setSubmitting] = useState(false);
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
  // Merge products + topSellingItems (deduped) so items added from Best Sellers are found
  const allMenuItems = [...products, ...topSellingItems.filter((t) => !products.some((p) => p.id === t.id))];
  const cartItems = allMenuItems.filter((p) => cart[p.id]);
  const grandTotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.price * cart[item.id], 0),
    [cartItems, cart],
  );

  const handleConfirmOrder = async (billingData: any) => {
    if (!cartItems.length || submitting) return;
    setSubmitting(true);
    try {
      const items = cartItems.map((item) => ({
        menuItemId: item.id,
        itemName: item.name,
        quantity: cart[item.id],
        price: item.price,
      }));
      // Step 1: Create the running order (sends to kitchen)
      const saveResponse = await saveRunningOrder({
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        createdById: user.id,
        orderType: billingType,
        customerName,
        customerPhone,
        customerAddress,
        items,
      });
      if (!saveResponse.success) return;

      const runningOrderId = saveResponse.data?.id;

      // Step 2: Immediately close it and create the Bill record
      const response = await closeRunningOrder({
        runningOrderId,
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        customerName,
        customerPhone,
        customerAddress,
        paymentMethod: billingData.paymentMethod,
        orderType: billingType,
        subtotal: grandTotal,
        discountAmount: billingData.discountAmount,
        packingCharge: billingData.packingCharge,
        serviceCharge: billingData.serviceChargeAmount,
        gstAmount: billingData.gstAmount,
        cgst: billingData.cgst,
        sgst: billingData.sgst,
        finalAmount: billingData.grandTotal,
      });
      if (response.success) {
        const billNo = response.data?.billNo || response.data?.id || `BILL-${Date.now()}`;
        // Silent print — fires and forgets; UI resets regardless of print outcome
        printReceipt({
          shopName: branchData?.restaurant?.name || user?.restaurant?.name || "Restaurant",
          shopAddress: branchData?.address || user?.branch?.address,
          shopGstin: branchData?.restaurant?.gstNumber || user?.restaurant?.gstNumber,
          billNo,
          customerName,
          billingType,
          paymentMethod: billingData.paymentMethod,
          items,
          subtotal: grandTotal,
          discountAmount: billingData.discountAmount,
          cgst: billingData.cgst,
          sgst: billingData.sgst,
          serviceChargeAmount: billingData.serviceChargeAmount,
          packingCharge: billingData.packingCharge,
          grandTotal: billingData.grandTotal,
        });
        setCart({});
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setStep("MENU");
      }
    } finally {
      setSubmitting(false);
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
          loading={submitting}
        />
      )}
    </div>
  );
}
