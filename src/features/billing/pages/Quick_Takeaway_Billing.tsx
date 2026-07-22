import MenuSection from "@/components/billing/MenuSection";
import CartSection from "@/components/billing/CartSection";
import CustomerSection from "@/components/billing/CustomerSection";
import AddOnSelectorModal from "@/components/billing/AddOnSelectorModal";
import { useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";
import { saveRunningOrder, closeRunningOrder } from "@/services/runningOrderService";
import { isNetworkError } from "@/utils/offlineQueue";
import { PauseCircle, Play } from "lucide-react";
import { printReceipt } from "@/utils/printer";

type HeldOrder = {
  id: string;
  cart: Record<number, number>;
  cartNotes: Record<number, string>;
  cartAddOns: Record<number, { name: string; price: number }[]>;
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
  addOnMap: Record<number, any[]>;
};

export default function NormalBilling({
  step,
  setStep,
  billingType,
  products,
  categories,
  topSellingItems,
  branchData,
  addOnMap,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState("Best Sellers");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartNotes, setCartNotes] = useState<Record<number, string>>({});
  const [cartAddOns, setCartAddOns] = useState<Record<number, { name: string; price: number }[]>>({});
  const [addOnModal, setAddOnModal] = useState<any>(null);
  const HELD_STORAGE_KEY = `held_orders_${billingType}`;
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => {
    try {
      const saved = localStorage.getItem(HELD_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAppSelector((state) => state.auth);

  // Take Away and Quick Bill share this screen now — the specific type is
  // picked at checkout (CustomerSection), right before the bill is generated.
  const availableOrderTypes = useMemo(() => {
    const enabled: string[] = branchData?.billing?.billingTypes || [];
    const opts: { key: string; label: string }[] = [];
    if (enabled.includes("Takeaway Billing")) opts.push({ key: "TAKE_AWAY", label: "Take Away" });
    if (enabled.includes("Quick Billing")) opts.push({ key: "QUICK_BILL", label: "Quick Bill" });
    return opts.length ? opts : [{ key: "TAKE_AWAY", label: "Take Away" }];
  }, [branchData]);
  const [selectedOrderType, setSelectedOrderType] = useState(availableOrderTypes[0].key);
  useEffect(() => {
    if (!availableOrderTypes.some((o) => o.key === selectedOrderType)) {
      setSelectedOrderType(availableOrderTypes[0].key);
    }
  }, [availableOrderTypes]);

  useEffect(() => {
    try {
      localStorage.setItem(HELD_STORAGE_KEY, JSON.stringify(heldOrders));
    } catch {
      // localStorage unavailable — hold is still functional in memory
    }
  }, [heldOrders]);

  const holdCurrentOrder = () => {
    if (!Object.keys(cart).length) return;
    const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);
    const newHeld: HeldOrder = {
      id: Date.now().toString(),
      cart,
      cartNotes,
      cartAddOns,
      customerName,
      customerPhone,
      customerAddress,
      itemCount,
      label: customerName.trim() || `Order #${heldOrders.length + 1}`,
    };
    setHeldOrders((prev) => [...prev, newHeld]);
    setCart({});
    setCartNotes({});
    setCartAddOns({});
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
        cartNotes,
        cartAddOns,
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
    setCartNotes(held.cartNotes || {});
    setCartAddOns(held.cartAddOns || {});
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

  // Add-ons apply once per cart line (not per unit) — the selector only
  // opens on the FIRST unit of an item that has attached groups.
  const bumpCart = (id: number) =>
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));

  const increaseQty = (id: number) => {
    const alreadyInCart = !!cart[id];
    const groups = addOnMap[id];
    if (!alreadyInCart && groups?.length) {
      const product = allMenuItems.find((p: any) => p.id === id);
      setAddOnModal(product || { id, name: "Item" });
      return;
    }
    bumpCart(id);
  };

  const decreaseQty = (id: number) =>
    setCart((prev) => {
      if ((prev[id] || 0) <= 1) {
        const u = { ...prev };
        delete u[id];
        setCartAddOns((p) => {
          const next = { ...p };
          delete next[id];
          return next;
        });
        return u;
      }
      return { ...prev, [id]: prev[id] - 1 };
    });

  const confirmAddOns = (selected: { name: string; price: number }[]) => {
    if (!addOnModal) return;
    if (selected.length) setCartAddOns((prev) => ({ ...prev, [addOnModal.id]: selected }));
    bumpCart(addOnModal.id);
    setAddOnModal(null);
  };

  const totalItems = Object.values(cart).reduce((acc, qty) => acc + qty, 0);
  // Merge products + topSellingItems (deduped) so items added from Best Sellers are found
  const allMenuItems = [...products, ...topSellingItems.filter((t) => !products.some((p) => p.id === t.id))];
  const cartItems = allMenuItems.filter((p) => cart[p.id]);
  const addOnUnitTotal = (itemId: number) =>
    (cartAddOns[itemId] || []).reduce((s, a) => s + a.price, 0);
  const grandTotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + (item.price + addOnUnitTotal(item.id)) * cart[item.id], 0),
    [cartItems, cart, cartAddOns],
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
        notes: cartNotes[item.id]?.trim() || undefined,
        addOns: cartAddOns[item.id] || [],
      }));
      const saveResponse = await saveRunningOrder({
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        createdById: user.id,
        orderType: selectedOrderType,
        customerName,
        customerPhone,
        customerAddress,
        items,
        subtotal: grandTotal,
        discountAmount: billingData.discountAmount,
        packingCharge: billingData.packingCharge,
        serviceCharge: billingData.serviceChargeAmount,
        gstAmount: billingData.gstAmount,
        cgst: billingData.cgst,
        sgst: billingData.sgst,
        finalAmount: billingData.grandTotal,
        tipAmount: billingData.tipAmount,
      });
      if (!saveResponse.success) return;

      if (saveResponse.queuedOffline) {
        toast(
          "No connection — order saved offline, will sync automatically once reconnected.",
          { icon: "📴", duration: 5000 },
        );
      }

      // Bill it upfront (quick/takeaway is paid before the kitchen preps it)
      // so the order shows as "Confirmed" on the Orders page immediately —
      // nobody has to watch the kitchen and remember to press "Complete"
      // there. keepOrderActive leaves the running order visible to the
      // kitchen; it closes itself out once marked READY.
      let billNo: string | null = null;
      if (!saveResponse.queuedOffline && saveResponse.data?.id) {
        try {
          const billResponse = await closeRunningOrder({
            runningOrderId: saveResponse.data.id,
            customerName,
            customerPhone,
            paymentMethod: billingData.paymentMethod,
            orderType: selectedOrderType,
            orderStatus: "CONFIRMED",
            keepOrderActive: true,
            subtotal: grandTotal,
            discountAmount: billingData.discountAmount,
            packingCharge: billingData.packingCharge,
            serviceCharge: billingData.serviceChargeAmount,
            gstAmount: billingData.gstAmount,
            cgst: billingData.cgst,
            sgst: billingData.sgst,
            finalAmount: billingData.grandTotal,
            tipAmount: billingData.tipAmount,
          });
          if (billResponse.success) billNo = billResponse.data?.billNo ?? null;
          else toast.error(billResponse.message || "Order sent to kitchen, but billing failed — complete it from Orders.");
        } catch (err: any) {
          // The KOT is already placed either way — if billing fails (e.g.
          // connection dropped between the two calls), staff can still
          // finish it manually from the Orders page's "Complete" button.
          toast.error(
            isNetworkError(err)
              ? "Order sent to kitchen — no connection to bill it now, complete it from Orders once reconnected."
              : "Order sent to kitchen, but billing failed — complete it from Orders.",
          );
        }
      }

      if (billingData.shouldPrint) {
        const printed = await printReceipt({
          shopName: branchData?.restaurant?.name || user?.restaurant?.name || "Restaurant",
          shopAddress: branchData?.address || user?.branch?.address,
          shopGstin: branchData?.restaurant?.gstNumber || user?.restaurant?.gstNumber,
          billNo: billNo ?? (saveResponse.queuedOffline
            ? "PENDING — NOT YET SYNCED"
            : `KOT-${saveResponse.data?.id ?? Date.now()}`),
          customerName,
          billingType: selectedOrderType,
          paymentMethod: billingData.paymentMethod,
          items,
          subtotal: grandTotal,
          discountAmount: billingData.discountAmount,
          cgst: billingData.cgst,
          sgst: billingData.sgst,
          serviceChargeAmount: billingData.serviceChargeAmount,
          packingCharge: billingData.packingCharge,
          grandTotal: billingData.grandTotal,
          tipAmount: billingData.tipAmount,
        });
        if (!printed) toast.error("Print failed — check the printer connection.");
      }

      setCart({});
      setCartNotes({});
      setCartAddOns({});
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setStep("MENU");
    } catch {
      toast.error("Couldn't complete this order — please try again.");
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
                    {selectedOrderType === "TAKE_AWAY" ? "Takeaway" : "Quick Bill"}
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
                {selectedOrderType === "TAKE_AWAY" ? "Takeaway" : "Quick Billing"}
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
          notes={cartNotes}
          setNote={(id, note) => setCartNotes((prev) => ({ ...prev, [id]: note }))}
          addOns={cartAddOns}
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
          orderTypeOptions={availableOrderTypes}
          selectedOrderType={selectedOrderType}
          setSelectedOrderType={setSelectedOrderType}
          setStep={setStep}
          onConfirm={handleConfirmOrder}
          billing={branchData.billing}
          loading={submitting}
        />
      )}

      {addOnModal && (
        <AddOnSelectorModal
          itemName={addOnModal.name}
          groups={addOnMap[addOnModal.id] || []}
          onConfirm={confirmAddOns}
          onCancel={() => {
            bumpCart(addOnModal.id);
            setAddOnModal(null);
          }}
        />
      )}
    </div>
  );
}
