import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  saveRunningOrder,
  getRunningOrderByTable,
} from "@/services/runningOrderService";
import MenuSection from "@/components/billing/MenuSection";
import CartSection from "@/components/billing/CartSection";
import CustomerSection from "@/components/billing/CustomerSection";
import {
  createRestaurantTable,
  deleteRestaurantTable,
} from "@/services/restaurantTableService";
import { Settings, ArrowLeft, X } from "lucide-react";

type Props = {
  step: string;
  setStep: any;
  billingType: string;
  selectedTable: any;
  setSelectedTable: any;
  products: any[];
  categories: any[];
  tables: any[];
  topSellingItems: any[];
  fetchData: any;
  loading: boolean;
  branchData: any;
  runningOrders: any[];
};

export default function DineIn({
  step,
  setStep,
  selectedTable,
  setSelectedTable,
  products,
  categories,
  tables,
  topSellingItems,
  fetchData,
  loading,
  branchData,
  billingType,
  runningOrders,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState("Best Sellers");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<any>({});
  const [runningOrderId, setRunningOrderId] = useState<number | null>(null);
  const { user } = useAppSelector((state) => state.auth);
  const [showModifyTables, setShowModifyTables] = useState(false);
  const [floorAction, setFloorAction] = useState<"HOME" | "SUB_TABLE" | "MERGE">("HOME");
  const [selectedParentTable, setSelectedParentTable] = useState<any>(null);
  const [tempTableName, setTempTableName] = useState("");
  const [tempCapacity, setTempCapacity] = useState("");
  const [mergeTables, setMergeTables] = useState<any[]>([]);

  const canCheckout = user?.role === "MANAGER" || user?.role === "CASHIER";

  // Safety net: STAFF cannot reach the CUSTOMER (billing) step
  useEffect(() => {
    if (step === "CUSTOMER" && !canCheckout) {
      setStep("MENU");
    }
  }, [step, canCheckout]);

  const filteredProducts =
    selectedCategory === "Best Sellers"
      ? topSellingItems
      : products.filter(
          (p: any) =>
            categories.find((c: any) => c.id === p.categoryId)?.name === selectedCategory,
        );

  const increaseQty = (id: number) =>
    setCart((prev: any) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));

  const decreaseQty = (id: number) =>
    setCart((prev: any) => {
      if ((prev[id] || 0) <= 1) { const u = { ...prev }; delete u[id]; return u; }
      return { ...prev, [id]: prev[id] - 1 };
    });

  const totalItems: number = Object.values(cart).reduce(
    (acc: any, qty: any) => acc + qty, 0,
  ) as number;
  const cartItems = products.filter((p) => cart[p.id]);
  const grandTotal = cartItems.reduce((acc, item) => acc + item.price * cart[item.id], 0);

  const handleConfirmOrder = async (billingData: any) => {
    if (!cartItems.length) return;
    const items = cartItems.map((item) => ({
      menuItemId: item.id, itemName: item.name, quantity: cart[item.id], price: item.price,
    }));
    const response = await saveRunningOrder({
      restaurantId: user.restaurantId, branchId: user.branchId, createdById: user.id,
      orderType: billingType, customerName, customerPhone, customerAddress,
      paymentMethod: billingData.paymentMethod, subtotal: grandTotal,
      discountAmount: billingData.discountAmount, packingCharge: billingData.packingCharge,
      serviceCharge: billingData.serviceChargeAmount, gstAmount: billingData.gstAmount,
      cgst: billingData.cgst, sgst: billingData.sgst, finalAmount: billingData.grandTotal, items,
    });
    if (response.success) {
      setCart({}); setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); setStep("MENU");
    }
  };

  const fetchExistingOrder = async (tableId: number) => {
    try {
      const response = await getRunningOrderByTable(tableId);
      if (response.data) {
        setCart({}); setRunningOrderId(response.data.id);
        const updatedCart: any = {};
        response.data.batches.forEach((batch: any) => {
          batch.items.forEach((item: any) => {
            updatedCart[item.menuItemId] = (updatedCart[item.menuItemId] || 0) + item.quantity;
          });
        });
        setCart(updatedCart);
      }
    } catch (error) { console.log(error); }
  };

  const handleSaveOrder = async () => {
    if (!selectedTable || !cartItems.length) return;
    const items = cartItems.map((item) => ({
      menuItemId: item.id, itemName: item.name, quantity: cart[item.id], price: item.price,
    }));
    const response = await saveRunningOrder({
      restaurantId: user.restaurantId, branchId: user.branchId, createdById: user.id,
      tableId: selectedTable.id, items, orderType: "DINE_IN",
    });
    if (response.success) {
      setRunningOrderId(response.data?.id || runningOrderId); setCart({}); await fetchData();
    }
  };

  const handleCreateSubTable = async () => {
    if (!selectedParentTable || !tempTableName) return;
    await createRestaurantTable({
      name: tempTableName, capacity: Number(tempCapacity), status: "AVAILABLE",
      isTemporary: true, tempTableType: "SPLIT", parentTableIds: String(selectedParentTable.id),
      restaurantId: user.restaurantId, branchId: user.branchId,
    });
    setTempTableName(""); setTempCapacity(""); setSelectedParentTable(null);
    setFloorAction("HOME"); await fetchData();
  };

  const handleCreateMergeTable = async () => {
    if (mergeTables.length < 2) return;
    await createRestaurantTable({
      name: mergeTables.map((t) => t.name).join("-"),
      capacity: mergeTables.reduce((acc, t) => acc + (t.capacity || 0), 0),
      status: "AVAILABLE", isTemporary: true, tempTableType: "MERGE",
      parentTableIds: mergeTables.map((t) => t.id).join(","),
      restaurantId: user.restaurantId, branchId: user.branchId,
    });
    setMergeTables([]); setFloorAction("HOME"); await fetchData();
  };

  const getTableColorState = (tableId: number): "available" | "in_kitchen" | "occupied" => {
    const tableOrders = runningOrders.filter((o: any) => o.tableId === tableId);
    if (tableOrders.length === 0) return "available";
    const hasInKitchen = tableOrders.some(
      (o: any) => !o.status || o.status === "PENDING" || o.status === "NEW" || o.status === "PREPARING",
    );
    return hasInKitchen ? "in_kitchen" : "occupied";
  };

  const nonTempTables = tables.filter((t) => !t.isTemporary);
  const availableCount = nonTempTables.filter((t) => getTableColorState(t.id) === "available").length;
  const inKitchenCount = nonTempTables.filter((t) => getTableColorState(t.id) === "in_kitchen").length;
  const occupiedCount = nonTempTables.filter((t) => getTableColorState(t.id) === "occupied").length;
  const tempCount = tables.filter((t) => t.isTemporary).length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ===== TABLE SELECTION VIEW ===== */}
      {!selectedTable && (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* TOP BAR */}
          <div className="shrink-0 border-b border-gray-100 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black tracking-tight text-gray-900">
                  Restaurant Floor
                </h2>
                <p className="text-[10px] text-gray-500">Select a table to begin</p>
              </div>
              <div className="flex items-center gap-1.5">
                {/* STATUS BADGES */}
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                  {availableCount} Avail
                </span>
                {inKitchenCount > 0 && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
                    {inKitchenCount} Kitchen
                  </span>
                )}
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700">
                  {occupiedCount} Occ
                </span>
                {tempCount > 0 && (
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-black text-purple-700">
                    {tempCount} Temp
                  </span>
                )}
                {/* FLOOR MGMT BUTTON — Manager/Cashier only */}
                {canCheckout && (
                  <button
                    onClick={() => { setShowModifyTables(true); setFloorAction("HOME"); }}
                    className="flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1.5 text-[11px] font-black text-white shadow-sm transition hover:bg-red-600 active:scale-95"
                  >
                    <Settings className="h-3 w-3" />
                    Floor
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TABLE GRID + SIDE PANEL */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* TABLE GRID */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {tables.map((table) => {
                  const colorState = table.isTemporary ? null : getTableColorState(table.id);
                  const isTemp = table.isTemporary;
                  const isMerge = table.tempTableType === "MERGE";

                  let borderColor = "border-emerald-200";
                  let bgColor = "from-white to-emerald-50";
                  let dotColor = "bg-emerald-500";
                  let labelBg = "bg-emerald-100 text-emerald-700";
                  let label = "Available";

                  if (isTemp && isMerge) {
                    borderColor = "border-orange-200"; bgColor = "from-white to-orange-50";
                    dotColor = "bg-orange-500"; labelBg = "bg-orange-100 text-orange-700"; label = "Merged";
                  } else if (isTemp) {
                    borderColor = "border-purple-200"; bgColor = "from-white to-purple-50";
                    dotColor = "bg-purple-500"; labelBg = "bg-purple-100 text-purple-700"; label = "Split";
                  } else if (colorState === "in_kitchen") {
                    borderColor = "border-amber-200"; bgColor = "from-white to-amber-50";
                    dotColor = "bg-amber-500"; labelBg = "bg-amber-100 text-amber-700"; label = "In Kitchen";
                  } else if (colorState === "occupied") {
                    borderColor = "border-red-200"; bgColor = "from-white to-red-50";
                    dotColor = "bg-red-500"; labelBg = "bg-red-100 text-red-700"; label = "Occupied";
                  }

                  return (
                    <button
                      key={table.id}
                      onClick={async () => {
                        setSelectedTable(table); setStep("MENU");
                        if (colorState && colorState !== "available") await fetchExistingOrder(table.id);
                        else { setCart({}); setRunningOrderId(null); }
                      }}
                      className={`relative flex flex-col justify-between overflow-hidden rounded-xl border-2 p-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md bg-gradient-to-br ${borderColor} ${bgColor}`}
                    >
                      {/* TOP ROW */}
                      <div className="flex items-start justify-between">
                        <div>
                          {isTemp && (
                            <div className={`mb-1 inline-flex rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase ${labelBg}`}>
                              {isMerge ? "Merge" : "Split"}
                            </div>
                          )}
                          <h3 className="text-lg font-black tracking-tight text-gray-900">
                            {table.name}
                          </h3>
                        </div>
                        <div className={`h-2 w-2 rounded-full ${dotColor}`} />
                      </div>

                      {/* BOTTOM ROW */}
                      <div className="flex items-end justify-between mt-1.5">
                        <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase ${labelBg}`}>
                          {label}
                        </span>
                        <div className="text-right">
                          <p className="text-xs font-black text-gray-900">{table.capacity}</p>
                          <p className="text-[7px] font-bold uppercase text-gray-400">seats</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DESKTOP LIVE OPS PANEL */}
            <div className="hidden xl:flex xl:w-[220px] shrink-0 flex-col border-l border-gray-100 overflow-y-auto">
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-xs font-black text-gray-900">Live Operations</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Floor activity</p>
              </div>
              <div className="p-3 space-y-3">
                {/* OCCUPANCY */}
                <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-3 text-white">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-red-100">Occupancy</p>
                  <h2 className="mt-1 text-3xl font-black">
                    {tables.length > 0 ? Math.round((occupiedCount / tables.length) * 100) : 0}%
                  </h2>
                  <p className="text-[10px] text-red-100 mt-0.5">
                    {occupiedCount} of {tables.length} tables
                  </p>
                </div>

                {/* ACTIVE TABLES */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-900">Active Tables</h4>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700">{occupiedCount}</span>
                  </div>
                  <div className="space-y-1.5">
                    {tables.filter((t) => t.status === "OCCUPIED").map((table) => (
                      <div key={table.id} className="rounded-xl border border-red-100 bg-red-50 px-2.5 py-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black text-gray-900">{table.name}</h5>
                          <span className="text-[10px] font-bold text-red-600">{table.capacity}s</span>
                        </div>
                      </div>
                    ))}
                    {occupiedCount === 0 && (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-6">
                        <span className="text-xl">🍽</span>
                        <p className="mt-1.5 text-[10px] font-bold text-gray-500">No active tables</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== FLOOR MANAGEMENT DRAWER ===== */}
      {showModifyTables && (
        <>
          <div onClick={() => setShowModifyTables(false)} className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm" />
          <div className="fixed bottom-0 right-0 z-[1000] flex flex-col overflow-hidden bg-white shadow-2xl h-[88vh] w-full rounded-t-2xl xl:top-0 xl:h-screen xl:w-[360px] xl:rounded-none xl:border-l xl:border-gray-200">
            {/* HEADER */}
            <div className="shrink-0 bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-red-100">Restaurant</p>
                  <h2 className="text-lg font-black mt-0.5">Floor Management</h2>
                </div>
                <button onClick={() => setShowModifyTables(false)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 transition hover:bg-white/30">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-3">
              {/* HOME */}
              {floorAction === "HOME" && (
                <div className="space-y-2">
                  <button onClick={() => setFloorAction("SUB_TABLE")}
                    className="w-full rounded-xl border border-purple-100 bg-gradient-to-br from-white to-purple-50 p-3 text-left transition hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-purple-500">Split Billing</p>
                        <h3 className="mt-0.5 text-sm font-black text-gray-900">Create Sub Table</h3>
                        <p className="text-[10px] text-gray-500">Create 1A, 1B temporary tables</p>
                      </div>
                      <span className="text-2xl">🍽</span>
                    </div>
                  </button>

                  <button onClick={() => setFloorAction("MERGE")}
                    className="w-full rounded-xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-3 text-left transition hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-orange-500">Family Seating</p>
                        <h3 className="mt-0.5 text-sm font-black text-gray-900">Merge Tables</h3>
                        <p className="text-[10px] text-gray-500">Combine multiple tables together</p>
                      </div>
                      <span className="text-2xl">🪑</span>
                    </div>
                  </button>

                  {/* TEMP TABLES LIST */}
                  <div className="pt-1">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-black text-gray-900">Temporary Tables</h3>
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-700">{tempCount} active</span>
                    </div>
                    <div className="space-y-1.5">
                      {tables.filter((t) => t.isTemporary).map((table) => (
                        <div key={table.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase ${table.tempTableType === "MERGE" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"}`}>
                                {table.tempTableType === "MERGE" ? "Merged" : "Split"}
                              </span>
                              <h4 className="mt-1 text-base font-black text-gray-900">{table.name}</h4>
                              <p className="text-[10px] text-gray-500">Parent: {table.parentTableIds}</p>
                            </div>
                            <span className="text-xs font-black text-gray-700">{table.capacity} seats</span>
                          </div>
                          <div className="mt-2 flex gap-1.5">
                            <button onClick={() => { setSelectedTable(table); setShowModifyTables(false); setStep("MENU"); }}
                              className="flex-1 rounded-lg bg-white px-2 py-1.5 text-[11px] font-black text-gray-700 shadow-sm border border-gray-200">
                              Open
                            </button>
                            <button onClick={async () => { await deleteRestaurantTable(table.id); await fetchData(); }}
                              className="rounded-lg border border-red-100 bg-red-50 px-2 py-1.5 text-[11px] font-black text-red-600">
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      {tempCount === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8">
                          <span className="text-2xl">🪑</span>
                          <p className="mt-2 text-xs font-black text-gray-700">No Temporary Tables</p>
                          <p className="mt-0.5 text-[10px] text-gray-400">Split & merged tables appear here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TABLE */}
              {floorAction === "SUB_TABLE" && (
                <div>
                  <button onClick={() => setFloorAction("HOME")} className="mb-3 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 shadow-sm">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-black text-gray-700">Select Parent Table</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {tables.filter((t) => !t.isTemporary).map((table) => (
                          <button key={table.id} onClick={() => setSelectedParentTable(table)}
                            className={`rounded-lg border p-2.5 text-left transition ${selectedParentTable?.id === table.id ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"}`}>
                            <h4 className="text-sm font-black text-gray-900">{table.name}</h4>
                            <p className="text-[10px] text-gray-500">{table.capacity} seats</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black text-gray-700">Sub Table Name</label>
                      <input value={tempTableName} onChange={(e) => setTempTableName(e.target.value)} placeholder="e.g. 1A"
                        className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm font-bold outline-none focus:border-red-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black text-gray-700">Seats</label>
                      <input value={tempCapacity} onChange={(e) => setTempCapacity(e.target.value)} placeholder="2" type="number"
                        className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm font-bold outline-none focus:border-red-400" />
                    </div>
                    <button onClick={handleCreateSubTable}
                      className="h-9 w-full rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-xs font-black text-white shadow-lg transition active:scale-[0.99]">
                      Create Sub Table
                    </button>
                  </div>
                </div>
              )}

              {/* MERGE */}
              {floorAction === "MERGE" && (
                <div>
                  <button onClick={() => setFloorAction("HOME")} className="mb-3 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 shadow-sm">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <label className="mb-2 block text-xs font-black text-gray-700">Select Tables to Merge</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {tables.filter((t) => !t.isTemporary).map((table) => {
                      const active = mergeTables.some((t) => t.id === table.id);
                      return (
                        <button key={table.id}
                          onClick={() => { if (active) setMergeTables((prev) => prev.filter((t) => t.id !== table.id)); else setMergeTables((prev) => [...prev, table]); }}
                          className={`relative rounded-lg border p-2.5 text-left transition ${active ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white"}`}>
                          {active && <div className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[8px] font-black text-white">✓</div>}
                          <h4 className="text-sm font-black text-gray-900">{table.name}</h4>
                          <p className="text-[10px] text-gray-500">{table.capacity} seats</p>
                        </button>
                      );
                    })}
                  </div>
                  {mergeTables.length > 0 && (
                    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-wide text-orange-600">Preview</p>
                      <h3 className="mt-0.5 text-lg font-black text-gray-900">{mergeTables.map((t) => t.name).join("-")}</h3>
                      <p className="text-[10px] text-gray-600">Total: {mergeTables.reduce((acc, t) => acc + t.capacity, 0)} seats</p>
                    </div>
                  )}
                  <button onClick={handleCreateMergeTable}
                    className="mt-3 h-9 w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-xs font-black text-white shadow-lg transition active:scale-[0.99]">
                    Create Merge Table
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== TABLE SELECTED VIEW ===== */}
      {selectedTable && (
        <div className="flex h-full flex-col overflow-hidden">
          {step === "MENU" && (
            <div className="flex h-full flex-col overflow-hidden xl:flex-row xl:gap-2">
              {/* LEFT — MENU AREA */}
              <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
                {/* Mobile table info */}
                <div className="xl:hidden shrink-0 mb-1.5 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wide">Selected Table</p>
                    <h3 className="text-sm font-black text-gray-900 leading-tight">{selectedTable.name}</h3>
                  </div>
                  <button onClick={() => setSelectedTable(null)} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-700 shadow-sm">
                    Change
                  </button>
                </div>

                {/* Menu section */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MenuSection categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
                    filteredProducts={filteredProducts} activeCart={cart} increaseQty={increaseQty} decreaseQty={decreaseQty} />
                </div>

                {/* Mobile action bar */}
                <div className="xl:hidden shrink-0 mt-1.5 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wide">Running Order</p>
                      <p className="text-sm font-black text-gray-900">
                        {totalItems} items · <span className="text-red-600">₹{grandTotal}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={handleSaveOrder} disabled={loading || !cartItems.length}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm disabled:opacity-50">
                        {loading ? "Saving..." : "Save"}
                      </button>
                      <button onClick={() => setStep("CART")} disabled={!cartItems.length}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                        Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT — DESKTOP ORDER PANEL */}
              <div className="hidden xl:flex xl:w-[240px] xl:shrink-0 xl:flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {/* Header */}
                <div className="shrink-0 border-b border-gray-100 px-3 py-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Current Order</p>
                      <h3 className="text-base font-black text-gray-900 mt-0.5">{selectedTable.name}</h3>
                    </div>
                    <button onClick={() => setSelectedTable(null)} className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-bold text-gray-700 transition hover:bg-gray-50">
                      Change
                    </button>
                  </div>
                </div>
                {/* Items */}
                <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
                  {cartItems.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 p-6 text-center">
                      <span className="text-2xl">🛒</span>
                      <p className="mt-2 text-xs font-bold text-gray-500">No items yet</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {cartItems.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-gray-900">{item.name}</p>
                            <p className="text-[10px] text-gray-500">× {cart[item.id]}</p>
                          </div>
                          <p className="ml-2 shrink-0 text-xs font-black text-red-600">₹{item.price * cart[item.id]}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Footer */}
                <div className="shrink-0 border-t border-gray-100 p-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-500">Total</p>
                      <p className="text-lg font-black text-red-600">₹{grandTotal}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={handleSaveOrder} disabled={loading || !cartItems.length}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">
                        {loading ? "Saving..." : "Save"}
                      </button>
                      <button onClick={() => setStep("CART")} disabled={!cartItems.length}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-red-600 disabled:opacity-50">
                        View Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "CART" && (
            <CartSection cartItems={cartItems} activeCart={cart} grandTotal={grandTotal} totalItems={totalItems}
              increaseQty={increaseQty} decreaseQty={decreaseQty} setStep={setStep} />
          )}
          {step === "CUSTOMER" && (
            <CustomerSection customerName={customerName} setCustomerName={setCustomerName}
              customerAddress={customerAddress} setCustomerAddress={setCustomerAddress}
              customerPhone={customerPhone} setCustomerPhone={setCustomerPhone}
              grand_Total={grandTotal} billingType="DINE_IN" setStep={setStep}
              onConfirm={handleConfirmOrder} billing={branchData.billing} />
          )}
        </div>
      )}
    </div>
  );
}
