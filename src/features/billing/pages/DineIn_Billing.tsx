import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  saveRunningOrder,
  getRunningOrderByTable,
  closeRunningOrder,
} from "@/services/runningOrderService";
import MenuSection from "@/components/billing/MenuSection";
import CartSection from "@/components/billing/CartSection";
import CustomerSection from "@/components/billing/CustomerSection";
import { getBranchDetails } from "@/services/branchService";
type Props = {
  step: string;
  setStep: any;
  selectedTable: any;
  setSelectedTable: any;
};

export default function DineIn({
  step,
  setStep,
  selectedTable,
  setSelectedTable,
}: Props) {
  const search = "";
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<any>({});
  const [tables, setTables] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [runningOrderId, setRunningOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, branch } = useAppSelector((state) => state.auth);
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

      return {
        ...prev,
        [id]: current - 1,
      };
    });
  };
  const totalItems: any = Object.values(cart).reduce(
    (acc: any, qty: any) => acc + qty,
    0,
  );
  const cartItems = products.filter((product) => cart[product.id]);
  const grandTotal = cartItems.reduce(
    (acc, item) => acc + item.price * cart[item.id],
    0,
  );
  const handleConfirmOrder = async () => {
    console.log("in");
    try {
      await closeRunningOrder({
        runningOrderId,

        customerName,

        customerPhone,

        paymentMethod: "CASH",

        orderType: "DINE_IN",

        orderStatus: "COMPLETED",
      });

      setCart({});

      setCustomerName("");

      setCustomerPhone("");

      setSelectedTable(null);

      setRunningOrderId(null);

      setStep("MENU");

      await fetchData();
    } catch (error) {
      console.log(error);
    }
  };
  const fetchData = async () => {
    try {
      const data = await getBranchDetails(branch);

      const menuItems = data.data.restaurant.menuItems || [];

      setProducts(menuItems);

      setTables(data.data.tables || []);

      // CREATE UNIQUE CATEGORIES

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

  const fetchExistingOrder = async (tableId: number) => {
    try {
      const response = await getRunningOrderByTable(tableId);

      if (response.data) {
        setCart({});
        setRunningOrderId(response.data.id);

        const updatedCart: any = {};

        response.data.batches.forEach((batch: any) => {
          batch.items.forEach((item: any) => {
            updatedCart[item.menuItemId] =
              (updatedCart[item.menuItemId] || 0) + item.quantity;
          });
        });

        setCart(updatedCart);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSaveOrder = async () => {
    try {
      if (!selectedTable) {
        return;
      }

      if (!cartItems.length) {
        return;
      }

      setLoading(true);

      const items = cartItems.map((item) => ({
        menuItemId: item.id,
        itemName: item.name,
        quantity: cart[item.id],
        price: item.price,
      }));

      const response = await saveRunningOrder({
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        createdById: user.id, // ✅ ADD THIS
        tableId: selectedTable.id,
        items,
        orderType: "DINE_IN",
      });

      if (response.success) {
        setRunningOrderId(response.data?.id || runningOrderId);
        setCart({});
        await fetchData();
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    console.log(user, branch);
    if (branch) {
      fetchData();
    }
  }, [branch]);
  return (
    <div className="flex h-[calc(100vh-140px)] flex-col overflow-hidden px-1 py-2 xl:py-3">
      {/* ================= TABLE SELECTION ================= */}
      {!selectedTable && (
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-50 via-white to-red-50/20">
          {/* ================= TOP ================= */}
          <div className="flex items-start justify-between gap-2 px-3 py-2.5 xl:px-4 xl:py-3">
            {/* LEFT */}
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black tracking-tight text-gray-900 xl:text-xl">
                Select Table
              </h2>
              <p className="mt-0.5 text-[11px] leading-tight text-gray-500">
                Start or continue dine-in billing
              </p>
            </div>
            {/* RIGHT STATUS */}
            <div className="flex shrink-0 items-center gap-1.5 xl:gap-2">
              {/* AVAILABLE */}
              <div className="flex h-9 items-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-2.5 shadow-sm xl:h-10 xl:gap-2 xl:px-4">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                {/* MOBILE */}
                <span className="text-[10px] font-black uppercase tracking-wide text-emerald-700 xl:hidden">
                  Avl
                </span>
                {/* DESKTOP */}
                <span className="hidden text-xs font-black uppercase tracking-wide text-emerald-700 xl:block">
                  Available
                </span>
                <span className="text-sm font-black text-emerald-700">
                  {tables.filter((t) => t.status === "AVAILABLE").length}
                </span>
              </div>
              {/* OCCUPIED */}
              <div className="flex h-9 items-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-2.5 shadow-sm xl:h-10 xl:gap-2 xl:px-4">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                {/* MOBILE */}
                <span className="text-[10px] font-black uppercase tracking-wide text-red-700 xl:hidden">
                  Occ
                </span>
                {/* DESKTOP */}
                <span className="hidden text-xs font-black uppercase tracking-wide text-red-700 xl:block">
                  Occupied
                </span>
                <span className="text-sm font-black text-red-700">
                  {tables.filter((t) => t.status === "OCCUPIED").length}
                </span>
              </div>
            </div>
          </div>
          {/* ================= DESKTOP LAYOUT ================= */}
          <div className="flex min-h-0 flex-1 flex-col xl:flex-row xl:gap-4 xl:px-4 xl:pb-4">
            {/* ================= LEFT ================= */}
            <div className="flex min-h-0 flex-1 flex-col">
              {/* TABLE GRID */}
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-3 xl:px-0 xl:pb-0">
                <div className="grid grid-cols-2 gap-2 xl:grid-cols-5 2xl:grid-cols-6">
                  {tables.map((table) => {
                    const occupied = table.status === "OCCUPIED";
                    return (
                      <button
                        key={table.id}
                        onClick={async () => {
                          setSelectedTable(table);

                          setStep("MENU");

                          if (table.status === "OCCUPIED") {
                            await fetchExistingOrder(table.id);
                          } else {
                            setCart({});

                            setRunningOrderId(null);
                          }
                        }}
                        className={`group relative flex h-[118px] xl:h-[150px] flex-col justify-between overflow-hidden rounded-[28px] border p-3 xl:p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.10)] ${
                          occupied
                            ? "border-red-200 bg-gradient-to-br from-white via-red-50 to-red-100/50"
                            : "border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-emerald-100/50"
                        }`}
                      >
                        {/* Glow */}
                        <div
                          className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl ${
                            occupied ? "bg-red-300/40" : "bg-emerald-300/40"
                          }`}
                        />
                        {/* TOP */}
                        <div className="relative z-10 flex items-start justify-between">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                              Table
                            </p>
                            <h2 className="mt-2 text-2xl xl:text-3xl font-black tracking-tight text-gray-900">
                              {table.name}
                            </h2>
                          </div>
                          <div
                            className={`h-3 w-3 rounded-full ${
                              occupied ? "bg-red-500" : "bg-emerald-500"
                            }`}
                          />
                        </div>
                        {/* BOTTOM */}
                        <div className="relative z-10 flex items-end justify-between">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
                              occupied
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {occupied ? "Occupied" : "Available"}
                          </span>
                          <div className="text-right">
                            <p className="text-xs font-bold text-gray-700">
                              {table.capacity}
                            </p>
                            <p className="text-[10px] text-gray-400">Seats</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* ================= RIGHT PANEL ================= */}
            <div className="hidden xl:flex xl:w-[320px] xl:flex-col">
              <div className="flex h-full flex-col rounded-[32px] border border-gray-200 bg-white shadow-sm">
                {/* HEADER */}
                <div className="border-b border-gray-100 p-5">
                  <h2 className="text-xl font-black tracking-tight text-gray-900">
                    Floor Status
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Live restaurant activity
                  </p>
                </div>
                {/* CONTENT */}
                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                  {/* OCCUPIED TABLES */}

                  {tables
                    .filter((table) => table.status === "OCCUPIED")
                    .map((table) => (
                      <div
                        key={table.id}
                        className="rounded-2xl border border-red-100 bg-red-50 p-4"
                      >
                        <div className="flex items-center justify-between">
                          {/* LEFT */}

                          <div>
                            <h3 className="text-lg font-black text-gray-900">
                              {table.name}
                            </h3>

                            <p className="mt-1 text-xs text-gray-500">
                              Running Order
                            </p>
                          </div>

                          {/* STATUS */}

                          <div className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">
                            ACTIVE
                          </div>
                        </div>

                        {/* BOTTOM */}

                        <div className="mt-4 flex items-center justify-between">
                          {/* SEATS */}

                          <div>
                            <p className="text-xs text-gray-500">Seats</p>

                            <p className="text-sm font-bold text-gray-900">
                              {table.capacity}
                            </p>
                          </div>

                          {/* STATUS */}

                          <div className="text-right">
                            <p className="text-xs text-gray-500">Status</p>

                            <p className="text-sm font-black text-red-600">
                              Occupied
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* EMPTY STATE */}

                  {tables.filter((table) => table.status === "OCCUPIED")
                    .length === 0 && (
                    <div className="flex h-[200px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50">
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">
                          No Active Tables
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Running dine-in orders will appear here
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ================= TABLE SELECTED ================= */}
      {selectedTable && (
        <>
          {/* ================= MENU ================= */}
          {step === "MENU" && (
            <div className="flex h-full min-h-0 flex-col overflow-hidden xl:flex-row xl:gap-3">
              {/* ================= LEFT ================= */}
              <div className="flex min-h-0 flex-1 flex-col">
                {/* ================= MOBILE TABLE INFO ================= */}
                <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm xl:hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Selected Table</p>
                      <h2 className="mt-1 text-xl font-black text-gray-900">
                        {selectedTable.name}
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedTable(null)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
                    >
                      Change
                    </button>
                  </div>
                </div>
                {/* ================= MENU ================= */}
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
              {/* ================= MOBILE BOTTOM BAR ================= */}
              <div className="absolute bottom-4 left-1 right-1 rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] xl:hidden">
                <div className="flex items-center justify-between">
                  {/* LEFT */}
                  <div>
                    <p className="text-xs text-gray-500">Running Order</p>
                    <h2 className="text-xl font-black text-red-600">
                      {totalItems}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">₹{grandTotal}</p>
                  </div>
                  {/* RIGHT */}
                  <div className="flex items-center gap-2">
                    {/* VIEW */}
                    <button
                      onClick={() => setStep("CART")}
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm"
                    >
                      View
                    </button>
                    {/* SAVE */}
                    <button
                      onClick={handleSaveOrder}
                      disabled={loading}
                      className="rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg"
                    >
                      {loading ? "Saving..." : "Save Order"}
                    </button>
                  </div>
                </div>
              </div>
              {/* ================= DESKTOP ORDER PANEL ================= */}
              <div className="hidden xl:flex xl:w-[320px] 2xl:w-[340px] xl:flex-col">
                <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
                  {/* HEADER */}
                  <div className="border-b border-gray-100 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                          Current Order
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-gray-900">
                          {selectedTable.name}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                          Active dine-in session
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedTable(null)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                  {/* ITEMS */}
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    <div className="space-y-3">
                      {cartItems.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                          <p className="text-sm text-gray-500">
                            No items added
                          </p>
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
                      <div className="flex items-center gap-2">
                        {/* SAVE */}
                        <button
                          className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
                          onClick={handleSaveOrder}
                        >
                          Save Order
                        </button>
                        {/* VIEW */}
                        <button
                          onClick={() => setStep("CART")}
                          className="rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-100 transition hover:bg-red-600"
                        >
                          View Order
                        </button>
                      </div>
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
          {step === "CUSTOMER" && (
            <CustomerSection
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              grandTotal={grandTotal}
              billingType="DINE_IN"
              setStep={setStep}
              onConfirm={handleConfirmOrder}
            />
          )}
        </>
      )}
    </div>
  );
}
