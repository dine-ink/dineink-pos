import MenuSection from "@/components/billing/MenuSection";
import CartSection from "@/components/billing/CartSection";
import CustomerSection from "@/components/billing/CustomerSection";

import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { getBranchDetails } from "@/services/branchService";
import { saveRunningOrder } from "@/services/runningOrderService";

type Props = {
  step: string;
  setStep: any;
  billingType: string;
};

export default function NormalBilling({ step, setStep, billingType }: Props) {
  const search = "";
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const { branch, user } = useAppSelector((state) => state.auth);
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory
      ? product.categoryId ===
        categories.find((c: any) => c.name === selectedCategory)?.id
      : true;

    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });
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

  const handleConfirmOrder = async () => {
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
        restaurantId: user.restaurantId,

        branchId: user.branchId,

        orderType: billingType,

        customerName,

        customerPhone,

        paymentMethod: "CASH",

        items,
      });

      if (response.success) {
        setCart({});

        setCustomerName("");

        setCustomerPhone("");

        setStep("MENU");
      }
    } catch (error) {
      console.log(error);
    } finally {
    }
  };

  const fetchData = async () => {
    try {
      const data = await getBranchDetails(branch);

      const menuItems = data.data.restaurant.menuItems || [];

      setProducts(menuItems);

      // UNIQUE CATEGORIES

      const categories = data.data.restaurant.categories || [];

      setCategories(categories);

      // DEFAULT CATEGORY

      if (categories.length > 0) {
        setSelectedCategory(categories[0].name);
      }
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    if (branch) {
      fetchData();
    }
  }, [branch]);
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
          grandTotal={grandTotal}
          billingType={billingType}
          setStep={setStep}
          onConfirm={handleConfirmOrder}
        />
      )}
    </div>
  );
}
