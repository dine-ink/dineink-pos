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
import {
  createRestaurantTable,
  deleteRestaurantTable,
} from "@/services/restaurantTableService";
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
  const [showModifyTables, setShowModifyTables] = useState(false);
  const [floorAction, setFloorAction] = useState<
    "HOME" | "SUB_TABLE" | "MERGE"
  >("HOME");
  const [modifyMode, setModifyMode] = useState<"SUB_TABLE" | "MERGE">(
    "SUB_TABLE",
  );
  const [topSellingItems, setTopSellingItems] = useState<any[]>([]);

  const [selectedParentTable, setSelectedParentTable] = useState<any>(null);

  const [tempTableName, setTempTableName] = useState("");

  const [tempCapacity, setTempCapacity] = useState("");

  const [mergeTables, setMergeTables] = useState<any[]>([]);
  const filteredProducts =
    selectedCategory === "Best Sellers"
      ? topSellingItems
      : products.filter(
          (product: any) =>
            categories.find((c: any) => c.id === product.categoryId)?.name ===
            selectedCategory,
        );
  const visibleTables = [...tables];
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
      console.log(selectedTable);
      if (selectedTable?.isTemporary) {
        await deleteRestaurantTable(selectedTable.id);
      }
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
      setTopSellingItems(data.data.topSellingItems || []);
      setTables(data.data.tables || []);

      // CREATE UNIQUE CATEGORIES

      const originalCategories = data.data.restaurant.categories || [];

      const categories = [
        {
          id: "BEST_SELLERS",

          name: "Best Sellers",

          iconName: "Trending",
        },

        ...originalCategories,
      ];
      setCategories(categories);

      // DEFAULT CATEGORY

      if (categories.length > 0) {
        setSelectedCategory("Best Sellers");
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
  const handleCreateSubTable = async () => {
    try {
      if (!selectedParentTable) {
        return;
      }

      if (!tempTableName) {
        return;
      }

      const payload = {
        name: tempTableName,

        capacity: Number(tempCapacity),

        status: "AVAILABLE",

        isTemporary: true,

        tempTableType: "SPLIT",

        parentTableIds: String(selectedParentTable.id),

        restaurantId: user.restaurantId,

        branchId: user.branchId,
      };

      await createRestaurantTable(payload);

      setTempTableName("");

      setTempCapacity("");

      setSelectedParentTable(null);

      setFloorAction("HOME");

      await fetchData();
    } catch (error) {
      console.log(error);
    }
  };
  const handleCreateMergeTable = async () => {
    try {
      if (mergeTables.length < 2) {
        return;
      }

      const payload = {
        name: mergeTables.map((t) => t.name).join("-"),

        capacity: mergeTables.reduce(
          (acc, table) => acc + (table.capacity || 0),
          0,
        ),

        status: "AVAILABLE",

        isTemporary: true,

        tempTableType: "MERGE",

        parentTableIds: mergeTables.map((t) => t.id).join(","),

        restaurantId: user.restaurantId,

        branchId: user.branchId,
      };

      await createRestaurantTable(payload);

      setMergeTables([]);

      setFloorAction("HOME");

      await fetchData();
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    console.log(user, branch);
    if (branch) {
      fetchData();
    }
  }, [branch]);
  return (
    <div className="mx-auto flex h-[calc(100vh-140px)] w-full  flex-col overflow-hidden px-2 py-2 xl:px-4 xl:py-4">
      {/* ================= TABLE SELECTION ================= */}
      {!selectedTable && (
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[36px] border border-gray-200 bg-gradient-to-br from-[#f8fafc] via-white to-[#fff1f2] shadow-[0_10px_40px_rgba(0,0,0,0.05)]">
          {/* ================= TOP BAR ================= */}
          <div className="border-b border-gray-100 px-4 py-4 xl:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              {/* LEFT */}
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-xl font-black text-white shadow-lg shadow-red-200">
                    🍽
                  </div>

                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-gray-900 xl:text-3xl">
                      Restaurant Floor
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Manage dine-in tables, split bills & live operations
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex flex-wrap items-center gap-2 hidden xl:flex">
                {/* FLOOR MANAGEMENT */}
                <button
                  onClick={() => {
                    setShowModifyTables(true);
                    setFloorAction("HOME");
                  }}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-200 transition hover:scale-[1.02]"
                >
                  <span className="text-lg">⚙</span>
                  Floor Management
                </button>

                {/* AVAILABLE */}
                <div className="flex h-11 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 shadow-sm">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

                  <span className="text-xs font-black uppercase tracking-wide text-emerald-700">
                    Available
                  </span>

                  <span className="text-base font-black text-emerald-700">
                    {tables.filter((t) => t.status === "AVAILABLE").length}
                  </span>
                </div>

                {/* OCCUPIED */}
                <div className="flex h-11 items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 shadow-sm">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500" />

                  <span className="text-xs font-black uppercase tracking-wide text-red-700">
                    Occupied
                  </span>

                  <span className="text-base font-black text-red-700">
                    {tables.filter((t) => t.status === "OCCUPIED").length}
                  </span>
                </div>

                {/* TEMP */}
                <div className="flex h-11 items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 px-4 shadow-sm">
                  <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />

                  <span className="text-xs font-black uppercase tracking-wide text-purple-700">
                    Temp
                  </span>

                  <span className="text-base font-black text-purple-700">
                    {tables.filter((t) => t.isTemporary).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ================= MAIN ================= */}
          <div className="flex min-h-0 flex-1 flex-col xl:flex-row xl:gap-5 xl:p-5">
            {/* ================= LEFT ================= */}
            <div className="flex min-h-0 flex-1 flex-col">
              {/* ================= MOBILE QUICK ACTIONS ================= */}
              <div className="px-3 pt-3 xl:hidden">
                {/* ACTIONS */}
                <div className="flex items-center gap-2">
                  {/* FLOOR */}
                  <button
                    onClick={() => {
                      setShowModifyTables(true);
                      setFloorAction("HOME");
                    }}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-100"
                  >
                    ⚙ Floor
                  </button>

                  {/* SPLIT */}
                  <button className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 shadow-sm">
                    + Split
                  </button>
                </div>

                {/* STATS */}
                <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                  {/* AVAILABLE */}
                  <div className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />

                    <span className="text-[11px] font-black uppercase tracking-wide text-emerald-700">
                      {tables.filter((t) => t.status === "AVAILABLE").length}{" "}
                      Avl
                    </span>
                  </div>

                  {/* OCCUPIED */}
                  <div className="flex shrink-0 items-center gap-1 rounded-full border border-red-100 bg-red-50 px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />

                    <span className="text-[11px] font-black uppercase tracking-wide text-red-700">
                      {tables.filter((t) => t.status === "OCCUPIED").length} Occ
                    </span>
                  </div>

                  {/* TEMP */}
                  <div className="flex shrink-0 items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />

                    <span className="text-[11px] font-black uppercase tracking-wide text-purple-700">
                      {tables.filter((t) => t.isTemporary).length} Temp
                    </span>
                  </div>
                </div>
              </div>

              {/* ================= TABLE GRID ================= */}
              <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-3 xl:mt-4 xl:px-0 xl:pb-0">
                <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4 2xl:grid-cols-5">
                  {visibleTables.map((table) => {
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
                        className={`group relative flex h-[115px] xl:h-[175px] flex-col justify-between overflow-hidden rounded-[24px] xl:rounded-[32px] border-2 p-3 xl:p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_50px_rgba(0,0,0,0.10)] ${
                          table.isTemporary
                            ? table.tempTableType === "MERGE"
                              ? "border-orange-200 bg-gradient-to-br from-white via-orange-50 to-orange-100/40"
                              : "border-purple-200 bg-gradient-to-br from-white via-purple-50 to-purple-100/40"
                            : occupied
                              ? "border-red-200 bg-gradient-to-br from-white via-red-50 to-red-100/40"
                              : "border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-emerald-100/40"
                        }`}
                      >
                        {/* GLOW */}
                        <div
                          className={`absolute -right-8 -top-8 h-20 w-20 rounded-full blur-3xl ${
                            table.isTemporary
                              ? table.tempTableType === "MERGE"
                                ? "bg-orange-300/20"
                                : "bg-purple-300/20"
                              : occupied
                                ? "bg-red-300/20"
                                : "bg-emerald-300/20"
                          }`}
                        />

                        {/* TOP */}
                        <div className="relative z-10 flex items-start justify-between">
                          <div>
                            {/* TEMP BADGE */}
                            {table.isTemporary && (
                              <div
                                className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wide ${
                                  table.tempTableType === "MERGE"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-purple-100 text-purple-700"
                                }`}
                              >
                                {table.tempTableType === "MERGE"
                                  ? "Merged"
                                  : "Split"}
                              </div>
                            )}

                            {/* TITLE */}
                            <h2 className="text-2xl xl:text-4xl font-black tracking-tight text-gray-900">
                              {table.name}
                            </h2>
                          </div>

                          {/* STATUS DOT */}
                          <div
                            className={`h-3 w-3 rounded-full ${
                              table.isTemporary
                                ? table.tempTableType === "MERGE"
                                  ? "bg-orange-500"
                                  : "bg-purple-500"
                                : occupied
                                  ? "bg-red-500"
                                  : "bg-emerald-500"
                            }`}
                          />
                        </div>

                        {/* BOTTOM */}
                        <div className="relative z-10 flex items-end justify-between">
                          {/* STATUS */}
                          <span
                            className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                              table.isTemporary
                                ? table.tempTableType === "MERGE"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-purple-100 text-purple-700"
                                : occupied
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {table.isTemporary
                              ? table.tempTableType === "MERGE"
                                ? "Merged"
                                : "Split"
                              : occupied
                                ? "Occupied"
                                : "Available"}
                          </span>

                          {/* SEATS */}
                          <div className="text-right">
                            <p className="text-sm xl:text-lg font-black text-gray-900">
                              {table.capacity}
                            </p>

                            <p className="text-[8px] xl:text-[10px] font-bold uppercase tracking-wide text-gray-400">
                              Seats
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* ================= FLOOR MANAGEMENT ================= */}
            {showModifyTables && (
              <>
                {/* BACKDROP */}
                <div
                  onClick={() => setShowModifyTables(false)}
                  className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm"
                />

                {/* DRAWER */}
                <div
                  className={`fixed bottom-0 right-0 z-[1000] flex flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300
      h-[92vh] w-full rounded-t-[36px]
      xl:top-0 xl:h-screen xl:w-[430px] xl:rounded-none xl:border-l xl:border-gray-200`}
                >
                  {/* HEADER */}
                  <div className="border-b border-gray-100 bg-gradient-to-r from-red-500 to-red-600 p-5 text-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-red-100">
                          Restaurant Operations
                        </p>

                        <h2 className="mt-2 text-3xl font-black tracking-tight">
                          Floor Management
                        </h2>

                        <p className="mt-1 text-sm text-red-100">
                          Manage split & merged tables
                        </p>
                      </div>

                      <button
                        onClick={() => setShowModifyTables(false)}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold text-white backdrop-blur"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="flex-1 overflow-y-auto p-5">
                    {/* ================= HOME ================= */}
                    {floorAction === "HOME" && (
                      <div className="space-y-4">
                        {/* ACTIONS */}
                        <button
                          onClick={() => setFloorAction("SUB_TABLE")}
                          className="group w-full rounded-[28px] border border-purple-100 bg-gradient-to-br from-white to-purple-50 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-purple-500">
                                Split Billing
                              </p>

                              <h2 className="mt-2 text-2xl font-black text-gray-900">
                                Create Sub Table
                              </h2>

                              <p className="mt-1 text-sm text-gray-500">
                                Create 1A, 1B style temporary tables
                              </p>
                            </div>

                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-100 text-3xl">
                              🍽
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() => setFloorAction("MERGE")}
                          className="group w-full rounded-[28px] border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-orange-500">
                                Family Seating
                              </p>

                              <h2 className="mt-2 text-2xl font-black text-gray-900">
                                Merge Tables
                              </h2>

                              <p className="mt-1 text-sm text-gray-500">
                                Combine multiple tables together
                              </p>
                            </div>

                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-100 text-3xl">
                              🪑
                            </div>
                          </div>
                        </button>

                        {/* TEMP TABLES */}
                        <div className="pt-4">
                          <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-black text-gray-900">
                              Temporary Tables
                            </h2>

                            <div className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-700">
                              {tables.filter((t) => t.isTemporary).length}{" "}
                              Active
                            </div>
                          </div>

                          <div className="space-y-3">
                            {tables
                              .filter((t) => t.isTemporary)
                              .map((table) => (
                                <div
                                  key={table.id}
                                  className="rounded-3xl border border-gray-100 bg-gray-50 p-4"
                                >
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div
                                        className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                                          table.tempTableType === "MERGE"
                                            ? "bg-orange-100 text-orange-700"
                                            : "bg-purple-100 text-purple-700"
                                        }`}
                                      >
                                        {table.tempTableType === "MERGE"
                                          ? "Merged"
                                          : "Split"}
                                      </div>

                                      <h3 className="mt-2 text-2xl font-black text-gray-900">
                                        {table.name}
                                      </h3>

                                      <p className="mt-1 text-xs text-gray-500">
                                        Parent: {table.parentTableIds}
                                      </p>
                                    </div>

                                    <div className="text-right">
                                      <p className="text-lg font-black text-gray-900">
                                        {table.capacity}
                                      </p>

                                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                        Seats
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-4 flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setSelectedTable(table);

                                        setShowModifyTables(false);

                                        setStep("MENU");
                                      }}
                                      className="flex-1 rounded-2xl bg-white px-4 py-3 text-xs font-black text-gray-700 shadow-sm"
                                    >
                                      Open
                                    </button>

                                    <button
                                      onClick={async () => {
                                        try {
                                          console.log(
                                            "Deleting table",
                                            table.id,
                                          );
                                          await deleteRestaurantTable(table.id);

                                          await fetchData();
                                        } catch (error) {
                                          console.log(error);
                                        }
                                      }}
                                      className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-black text-red-600"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}

                            {tables.filter((t) => t.isTemporary).length ===
                              0 && (
                              <div className="flex h-[220px] items-center justify-center rounded-[32px] border border-dashed border-gray-200 bg-gray-50">
                                <div className="text-center">
                                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-3xl shadow-sm">
                                    🪑
                                  </div>

                                  <p className="mt-4 text-lg font-black text-gray-800">
                                    No Temporary Tables
                                  </p>

                                  <p className="mt-1 text-sm text-gray-500">
                                    Split & merged tables appear here
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ================= SUB TABLE ================= */}
                    {floorAction === "SUB_TABLE" && (
                      <div>
                        <button
                          onClick={() => setFloorAction("HOME")}
                          className="mb-5 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 shadow-sm"
                        >
                          ← Back
                        </button>

                        <div className="space-y-5">
                          <div>
                            <label className="mb-2 block text-sm font-black text-gray-700">
                              Parent Table
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                              {tables
                                .filter((t) => !t.isTemporary)
                                .map((table) => (
                                  <button
                                    key={table.id}
                                    onClick={() =>
                                      setSelectedParentTable(table)
                                    }
                                    className={`rounded-2xl border p-4 text-left transition ${
                                      selectedParentTable?.id === table.id
                                        ? "border-red-500 bg-red-50"
                                        : "border-gray-200 bg-white"
                                    }`}
                                  >
                                    <h2 className="text-xl font-black text-gray-900">
                                      {table.name}
                                    </h2>

                                    <p className="mt-1 text-xs text-gray-500">
                                      {table.capacity} Seats
                                    </p>
                                  </button>
                                ))}
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-black text-gray-700">
                              Sub Table Name
                            </label>

                            <input
                              value={tempTableName}
                              onChange={(e) => setTempTableName(e.target.value)}
                              placeholder="1A"
                              className="h-14 w-full rounded-3xl border border-gray-200 px-4 text-lg font-bold outline-none focus:border-red-500"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-black text-gray-700">
                              Seats
                            </label>

                            <input
                              value={tempCapacity}
                              onChange={(e) => setTempCapacity(e.target.value)}
                              placeholder="2"
                              className="h-14 w-full rounded-3xl border border-gray-200 px-4 text-lg font-bold outline-none focus:border-red-500"
                            />
                          </div>

                          <button
                            onClick={handleCreateSubTable}
                            className="w-full rounded-3xl bg-gradient-to-r from-red-500 to-red-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-red-200"
                          >
                            Create Sub Table
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ================= MERGE ================= */}
                    {floorAction === "MERGE" && (
                      <div>
                        <button
                          onClick={() => setFloorAction("HOME")}
                          className="mb-5 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 shadow-sm"
                        >
                          ← Back
                        </button>

                        <div>
                          <label className="mb-3 block text-sm font-black text-gray-700">
                            Select Tables
                          </label>

                          <div className="grid grid-cols-2 gap-3">
                            {tables
                              .filter((t) => !t.isTemporary)
                              .map((table) => {
                                const active = mergeTables.some(
                                  (t) => t.id === table.id,
                                );

                                return (
                                  <button
                                    key={table.id}
                                    onClick={() => {
                                      if (active) {
                                        setMergeTables((prev) =>
                                          prev.filter((t) => t.id !== table.id),
                                        );
                                      } else {
                                        setMergeTables((prev) => [
                                          ...prev,
                                          table,
                                        ]);
                                      }
                                    }}
                                    className={`rounded-3xl border p-4 text-left transition ${
                                      active
                                        ? "border-orange-500 bg-orange-50"
                                        : "border-gray-200 bg-white"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <h2 className="text-xl font-black text-gray-900">
                                          {table.name}
                                        </h2>

                                        <p className="mt-1 text-xs text-gray-500">
                                          {table.capacity} Seats
                                        </p>
                                      </div>

                                      {active && (
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-white">
                                          ✓
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                          </div>

                          {mergeTables.length > 0 && (
                            <div className="mt-5 rounded-[32px] border border-orange-200 bg-orange-50 p-5">
                              <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                                Merge Preview
                              </p>

                              <h2 className="mt-2 text-3xl font-black text-gray-900">
                                {mergeTables.map((t) => t.name).join("-")}
                              </h2>

                              <p className="mt-2 text-sm text-gray-600">
                                Total Seats:{" "}
                                {mergeTables.reduce(
                                  (acc, table) => acc + table.capacity,
                                  0,
                                )}
                              </p>
                            </div>
                          )}

                          <button
                            onClick={handleCreateMergeTable}
                            className="mt-5 w-full rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-orange-200"
                          >
                            Create Merge Table
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {/* ================= RIGHT PANEL ================= */}
            <div className="hidden xl:flex xl:w-[360px] xl:flex-col">
              <div className="flex h-full flex-col overflow-hidden rounded-[36px] border border-gray-200 bg-white shadow-sm">
                {/* HEADER */}
                <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white p-6">
                  <h2 className="text-2xl font-black tracking-tight text-gray-900">
                    Live Operations
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Real-time restaurant floor activity
                  </p>
                </div>

                {/* CONTENT */}
                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  {/* OCCUPANCY */}
                  <div className="rounded-3xl bg-gradient-to-r from-red-500 to-red-600 p-5 text-white shadow-lg shadow-red-200">
                    <p className="text-xs font-bold uppercase tracking-wide text-red-100">
                      Floor Occupancy
                    </p>

                    <h2 className="mt-2 text-5xl font-black">
                      {tables.length > 0
                        ? Math.round(
                            (tables.filter((t) => t.status === "OCCUPIED")
                              .length /
                              tables.length) *
                              100,
                          )
                        : 0}
                      %
                    </h2>

                    <p className="mt-2 text-sm text-red-100">
                      Tables currently occupied
                    </p>
                  </div>

                  {/* TEMP TABLES */}
                  <div className="rounded-3xl border border-purple-100 bg-purple-50 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-purple-600">
                          Temporary Tables
                        </p>

                        <h2 className="mt-2 text-3xl font-black text-gray-900">
                          {tables.filter((t) => t.isTemporary).length}
                        </h2>
                      </div>

                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-2xl">
                        🪑
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE TABLES */}
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-black text-gray-900">
                        Active Tables
                      </h2>

                      <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                        {
                          tables.filter((table) => table.status === "OCCUPIED")
                            .length
                        }{" "}
                        Active
                      </div>
                    </div>

                    <div className="space-y-3">
                      {tables
                        .filter((table) => table.status === "OCCUPIED")
                        .map((table) => (
                          <div
                            key={table.id}
                            className="rounded-3xl border border-red-100 bg-red-50 p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-black text-gray-900">
                                  {table.name}
                                </h3>

                                <p className="mt-1 text-xs text-gray-500">
                                  Running dine-in session
                                </p>
                              </div>

                              <div className="rounded-full bg-red-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-red-700">
                                Active
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                              <div>
                                <p className="text-xs text-gray-500">
                                  Capacity
                                </p>

                                <p className="text-sm font-black text-gray-900">
                                  {table.capacity} Seats
                                </p>
                              </div>

                              <button className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-gray-700 shadow-sm transition hover:bg-gray-50">
                                Open
                              </button>
                            </div>
                          </div>
                        ))}

                      {tables.filter((table) => table.status === "OCCUPIED")
                        .length === 0 && (
                        <div className="flex h-[220px] items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50">
                          <div className="text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-3xl shadow-sm">
                              🍽
                            </div>

                            <p className="mt-4 text-lg font-black text-gray-800">
                              No Active Tables
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              Running orders will appear here
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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
