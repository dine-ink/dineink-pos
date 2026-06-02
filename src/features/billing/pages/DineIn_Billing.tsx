import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  saveRunningOrder,
  getRunningOrderByTable,
  updateRunningOrderStatus,
  closeRunningOrder,
  requestItemCancel,
} from "@/services/runningOrderService";
import MenuSection from "@/components/billing/MenuSection";
import CustomerSection from "@/components/billing/CustomerSection";
import {
  createRestaurantTable,
  deleteRestaurantTable,
} from "@/services/restaurantTableService";
import { Settings, ArrowLeft, X, Minus, Plus, Printer } from "lucide-react";

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
  runningOrders,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState("Best Sellers");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<any>({});
  const [tableOrders, setTableOrders] = useState<any[]>([]); // all KOTs for selected table
  const { user } = useAppSelector((state) => state.auth);
  const [showModifyTables, setShowModifyTables] = useState(false);
  const [floorAction, setFloorAction] = useState<
    "HOME" | "SUB_TABLE" | "MERGE"
  >("HOME");
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
            categories.find((c: any) => c.id === p.categoryId)?.name ===
            selectedCategory,
        );

  const increaseQty = (id: number) =>
    setCart((prev: any) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));

  const decreaseQty = (id: number) =>
    setCart((prev: any) => {
      if ((prev[id] || 0) <= 1) {
        const u = { ...prev };
        delete u[id];
        return u;
      }
      return { ...prev, [id]: prev[id] - 1 };
    });

  const totalItems: number = Object.values(cart).reduce(
    (acc: any, qty: any) => acc + qty,
    0,
  ) as number;
  // Merge products + topSellingItems (deduped) so items added from Best Sellers are found
  const allMenuItems = [
    ...products,
    ...topSellingItems.filter((t) => !products.some((p) => p.id === t.id)),
  ];
  const cartItems = allMenuItems.filter((p) => cart[p.id]);
  const grandTotal = cartItems.reduce(
    (acc, item) => acc + item.price * cart[item.id],
    0,
  );

  // Load all KOTs for this table — cart stays empty (new order starts fresh)
  const fetchExistingOrder = async (tableId: number) => {
    try {
      const response = await getRunningOrderByTable(tableId);
      const orders = Array.isArray(response.data)
        ? response.data
        : response.data
          ? [response.data]
          : [];
      setTableOrders(orders);
      setCart({});
    } catch {
      /* silent */
    }
  };

  // Save current cart as a NEW KOT — each save = separate running order in kitchen
  const handleSaveOrder = async () => {
    if (!selectedTable || !cartItems.length) return;
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
      tableId: selectedTable.id,
      items,
      orderType: "DINE_IN",
    });
    if (response.success) {
      setCart({});
      await fetchExistingOrder(selectedTable.id); // refresh order history
      await fetchData();
    }
  };

  // Close all running orders for this table and generate the bill
  const handleGenerateBill = async (billingData: any) => {
    if (!selectedTable) return;
    try {
      const response = await closeRunningOrder({
        tableId: selectedTable.id,
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        customerName,
        customerPhone,
        customerAddress,
        paymentMethod: billingData.paymentMethod,
        orderType: "DINE_IN",
        subtotal: billingData.subtotal,
        discountAmount: billingData.discountAmount,
        packingCharge: billingData.packingCharge,
        serviceCharge: billingData.serviceChargeAmount,
        gstAmount: billingData.gstAmount,
        cgst: billingData.cgst,
        sgst: billingData.sgst,
        finalAmount: billingData.grandTotal,
      });
      if (response.success) {
        setCart({});
        setTableOrders([]);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setSelectedTable(null);
        setStep("MENU");
        await fetchData();
      }
    } catch {
      /* silent */
    }
  };

  // Request item cancellation — kitchen will approve or reject
  const handleRequestCancel = async (itemId: number) => {
    try {
      await requestItemCancel(itemId);
      if (selectedTable) await fetchExistingOrder(selectedTable.id);
    } catch {
      /* silent */
    }
  };

  const printKOT = (order: any) => {
    const items = (order.batches?.flatMap((b: any) => b.items) ?? []).filter(
      (i: any) => i.status !== "CANCELLED",
    );
    const kotNo = order.orderNo ?? order.id;
    const time = new Date(order.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const pw = window.open("", "", "width=400,height=600");
    if (!pw) return;
    pw.document.write(`<html><head><title>KOT #${kotNo}</title>
<style>
@page{size:80mm auto;margin:0}
body{margin:0;padding:4px;font-family:monospace;color:black;background:white}
.c{text-align:center}.d{border-top:1px dashed black;margin:6px 0}
table{width:100%;border-collapse:collapse}
td{font-size:12px;padding:2px 0;vertical-align:top}
.n{width:70%}.q{width:30%;text-align:right;font-weight:bold;font-size:15px}
@media print{@page{size:80mm auto;margin:0}body{width:72mm}}
</style></head>
<body onload="window.print();window.close();">
<div class="c" style="margin-bottom:4px">
  <div style="font-size:10px;font-weight:bold;letter-spacing:2px">KITCHEN ORDER TICKET</div>
  <div style="font-size:18px;font-weight:bold;margin-top:2px">${branchData?.name || "DineInk"}</div>
</div>
<div class="d"></div>
<table>
  <tr><td><b>Table</b></td><td style="text-align:right;font-size:16px;font-weight:bold">${selectedTable?.name || "-"}</td></tr>
  <tr><td>KOT #</td><td style="text-align:right;font-weight:bold">${kotNo}</td></tr>
  <tr><td>Type</td><td style="text-align:right">DINE IN</td></tr>
  <tr><td>Time</td><td style="text-align:right">${time}</td></tr>
</table>
<div class="d"></div>
<table><tr><td class="n" style="font-size:11px;font-weight:bold">ITEM</td><td class="q" style="font-size:11px">QTY</td></tr></table>
<div class="d" style="margin:3px 0"></div>
<table><tbody>
${items.map((i: any) => `<tr><td class="n" style="font-size:14px;font-weight:bold;padding:3px 0">${i.itemName}</td><td class="q" style="font-size:18px">${i.quantity}</td></tr>`).join("")}
</tbody></table>
<div class="d"></div>
<div class="c" style="font-size:11px;font-weight:bold">*** KITCHEN COPY ***</div>
</body></html>`);
    pw.document.close();
  };

  const handleCreateSubTable = async () => {
    if (!selectedParentTable || !tempTableName) return;
    await createRestaurantTable({
      name: tempTableName,
      capacity: Number(tempCapacity),
      status: "AVAILABLE",
      isTemporary: true,
      tempTableType: "SPLIT",
      parentTableIds: String(selectedParentTable.id),
      restaurantId: user.restaurantId,
      branchId: user.branchId,
    });
    setTempTableName("");
    setTempCapacity("");
    setSelectedParentTable(null);
    setFloorAction("HOME");
    await fetchData();
  };

  const handleCreateMergeTable = async () => {
    if (mergeTables.length < 2) return;
    await createRestaurantTable({
      name: mergeTables.map((t) => t.name).join("-"),
      capacity: mergeTables.reduce((acc, t) => acc + (t.capacity || 0), 0),
      status: "AVAILABLE",
      isTemporary: true,
      tempTableType: "MERGE",
      parentTableIds: mergeTables.map((t) => t.id).join(","),
      restaurantId: user.restaurantId,
      branchId: user.branchId,
    });
    setMergeTables([]);
    setFloorAction("HOME");
    await fetchData();
  };

  const getTableColorState = (
    tableId: number,
  ): "available" | "in_kitchen" | "ready_to_serve" | "occupied" => {
    const tableOrders = runningOrders.filter((o: any) => o.tableId === tableId);
    if (tableOrders.length === 0) return "available";
    if (
      tableOrders.some(
        (o: any) =>
          !o.status ||
          o.status === "PENDING" ||
          o.status === "NEW" ||
          o.status === "PREPARING",
      )
    )
      return "in_kitchen";
    if (tableOrders.some((o: any) => o.status === "READY"))
      return "ready_to_serve";
    return "occupied"; // all DELIVERED — customer eating, bill not closed
  };

  const selectedTableColorState =
    selectedTable && !selectedTable.isTemporary
      ? getTableColorState(selectedTable.id)
      : null;

  const handleMarkDelivered = async () => {
    if (!selectedTable) return;
    const readyOrders = runningOrders.filter(
      (o: any) => o.tableId === selectedTable.id && o.status === "READY",
    );
    await Promise.all(
      readyOrders.map((o: any) => updateRunningOrderStatus(o.id, "DELIVERED")),
    );
    await fetchData();
  };

  const nonTempTables = tables.filter((t) => !t.isTemporary);
  const availableCount = nonTempTables.filter(
    (t) => getTableColorState(t.id) === "available",
  ).length;
  const inKitchenCount = nonTempTables.filter(
    (t) => getTableColorState(t.id) === "in_kitchen",
  ).length;
  const readyToServeCount = nonTempTables.filter(
    (t) => getTableColorState(t.id) === "ready_to_serve",
  ).length;
  const occupiedCount = nonTempTables.filter(
    (t) => getTableColorState(t.id) === "occupied",
  ).length;
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
                <p className="text-[10px] text-gray-500">
                  Select a table to begin
                </p>
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
                {readyToServeCount > 0 && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 animate-pulse">
                    {readyToServeCount} Ready
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
                    onClick={() => {
                      setShowModifyTables(true);
                      setFloorAction("HOME");
                    }}
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
                  const colorState = table.isTemporary
                    ? null
                    : getTableColorState(table.id);
                  const isTemp = table.isTemporary;
                  const isMerge = table.tempTableType === "MERGE";

                  let borderColor = "border-emerald-200";
                  let bgColor = "from-white to-emerald-50";
                  let dotColor = "bg-emerald-500";
                  let labelBg = "bg-emerald-100 text-emerald-700";
                  let label = "Available";

                  if (isTemp && isMerge) {
                    borderColor = "border-orange-200";
                    bgColor = "from-white to-orange-50";
                    dotColor = "bg-orange-500";
                    labelBg = "bg-orange-100 text-orange-700";
                    label = "Merged";
                  } else if (isTemp) {
                    borderColor = "border-purple-200";
                    bgColor = "from-white to-purple-50";
                    dotColor = "bg-purple-500";
                    labelBg = "bg-purple-100 text-purple-700";
                    label = "Split";
                  } else if (colorState === "in_kitchen") {
                    borderColor = "border-amber-200";
                    bgColor = "from-white to-amber-50";
                    dotColor = "bg-amber-500";
                    labelBg = "bg-amber-100 text-amber-700";
                    label = "In Kitchen";
                  } else if (colorState === "ready_to_serve") {
                    borderColor = "border-blue-300";
                    bgColor = "from-white to-blue-50";
                    dotColor = "bg-blue-500";
                    labelBg = "bg-blue-100 text-blue-700";
                    label = "Ready!";
                  } else if (colorState === "occupied") {
                    borderColor = "border-red-200";
                    bgColor = "from-white to-red-50";
                    dotColor = "bg-red-500";
                    labelBg = "bg-red-100 text-red-700";
                    label = "Occupied";
                  }

                  return (
                    <button
                      key={table.id}
                      onClick={async () => {
                        setSelectedTable(table);
                        setStep("MENU");
                        if (colorState && colorState !== "available")
                          await fetchExistingOrder(table.id);
                        else {
                          setCart({});
                          setTableOrders([]);
                        }
                      }}
                      className={`relative flex flex-col justify-between overflow-hidden rounded-xl border-2 p-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md bg-gradient-to-br ${borderColor} ${bgColor}`}
                    >
                      {/* TOP ROW */}
                      <div className="flex items-start justify-between">
                        <div>
                          {isTemp && (
                            <div
                              className={`mb-1 inline-flex rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase ${labelBg}`}
                            >
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
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase ${labelBg}`}
                        >
                          {label}
                        </span>
                        <div className="text-right">
                          <p className="text-xs font-black text-gray-900">
                            {table.capacity}
                          </p>
                          <p className="text-[7px] font-bold uppercase text-gray-400">
                            seats
                          </p>
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
                <h3 className="text-xs font-black text-gray-900">
                  Live Operations
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Floor activity
                </p>
              </div>
              <div className="p-3 space-y-3">
                {/* OCCUPANCY */}
                <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-3 text-white">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-red-100">
                    Occupancy
                  </p>
                  <h2 className="mt-1 text-3xl font-black">
                    {tables.length > 0
                      ? Math.round((occupiedCount / tables.length) * 100)
                      : 0}
                    %
                  </h2>
                  <p className="text-[10px] text-red-100 mt-0.5">
                    {occupiedCount} of {tables.length} tables
                  </p>
                </div>

                {/* ACTIVE TABLES */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-900">
                      Active Tables
                    </h4>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700">
                      {occupiedCount}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {tables
                      .filter((t) => t.status === "OCCUPIED")
                      .map((table) => (
                        <div
                          key={table.id}
                          className="rounded-xl border border-red-100 bg-red-50 px-2.5 py-2"
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-black text-gray-900">
                              {table.name}
                            </h5>
                            <span className="text-[10px] font-bold text-red-600">
                              {table.capacity}s
                            </span>
                          </div>
                        </div>
                      ))}
                    {occupiedCount === 0 && (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-6">
                        <span className="text-xl">🍽</span>
                        <p className="mt-1.5 text-[10px] font-bold text-gray-500">
                          No active tables
                        </p>
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
          <div
            onClick={() => setShowModifyTables(false)}
            className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm"
          />
          <div className="fixed bottom-0 right-0 z-[1000] flex flex-col overflow-hidden bg-white shadow-2xl h-[88vh] w-full rounded-t-2xl xl:top-0 xl:h-screen xl:w-[360px] xl:rounded-none xl:border-l xl:border-gray-200">
            {/* HEADER */}
            <div className="shrink-0 bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-red-100">
                    Restaurant
                  </p>
                  <h2 className="text-lg font-black mt-0.5">
                    Floor Management
                  </h2>
                </div>
                <button
                  onClick={() => setShowModifyTables(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 transition hover:bg-white/30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-3">
              {/* HOME */}
              {floorAction === "HOME" && (
                <div className="space-y-2">
                  <button
                    onClick={() => setFloorAction("SUB_TABLE")}
                    className="w-full rounded-xl border border-purple-100 bg-gradient-to-br from-white to-purple-50 p-3 text-left transition hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-purple-500">
                          Split Billing
                        </p>
                        <h3 className="mt-0.5 text-sm font-black text-gray-900">
                          Create Sub Table
                        </h3>
                        <p className="text-[10px] text-gray-500">
                          Create 1A, 1B temporary tables
                        </p>
                      </div>
                      <span className="text-2xl">🍽</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setFloorAction("MERGE")}
                    className="w-full rounded-xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-3 text-left transition hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-orange-500">
                          Family Seating
                        </p>
                        <h3 className="mt-0.5 text-sm font-black text-gray-900">
                          Merge Tables
                        </h3>
                        <p className="text-[10px] text-gray-500">
                          Combine multiple tables together
                        </p>
                      </div>
                      <span className="text-2xl">🪑</span>
                    </div>
                  </button>

                  {/* TEMP TABLES LIST */}
                  <div className="pt-1">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-black text-gray-900">
                        Temporary Tables
                      </h3>
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-700">
                        {tempCount} active
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {tables
                        .filter((t) => t.isTemporary)
                        .map((table) => (
                          <div
                            key={table.id}
                            className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span
                                  className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase ${table.tempTableType === "MERGE" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"}`}
                                >
                                  {table.tempTableType === "MERGE"
                                    ? "Merged"
                                    : "Split"}
                                </span>
                                <h4 className="mt-1 text-base font-black text-gray-900">
                                  {table.name}
                                </h4>
                                <p className="text-[10px] text-gray-500">
                                  Parent: {table.parentTableIds}
                                </p>
                              </div>
                              <span className="text-xs font-black text-gray-700">
                                {table.capacity} seats
                              </span>
                            </div>
                            <div className="mt-2 flex gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedTable(table);
                                  setShowModifyTables(false);
                                  setStep("MENU");
                                }}
                                className="flex-1 rounded-lg bg-white px-2 py-1.5 text-[11px] font-black text-gray-700 shadow-sm border border-gray-200"
                              >
                                Open
                              </button>
                              <button
                                onClick={async () => {
                                  await deleteRestaurantTable(table.id);
                                  await fetchData();
                                }}
                                className="rounded-lg border border-red-100 bg-red-50 px-2 py-1.5 text-[11px] font-black text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      {tempCount === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8">
                          <span className="text-2xl">🪑</span>
                          <p className="mt-2 text-xs font-black text-gray-700">
                            No Temporary Tables
                          </p>
                          <p className="mt-0.5 text-[10px] text-gray-400">
                            Split & merged tables appear here
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TABLE */}
              {floorAction === "SUB_TABLE" && (
                <div>
                  <button
                    onClick={() => setFloorAction("HOME")}
                    className="mb-3 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 shadow-sm"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-black text-gray-700">
                        Select Parent Table
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {tables
                          .filter((t) => !t.isTemporary)
                          .map((table) => (
                            <button
                              key={table.id}
                              onClick={() => setSelectedParentTable(table)}
                              className={`rounded-lg border p-2.5 text-left transition ${selectedParentTable?.id === table.id ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"}`}
                            >
                              <h4 className="text-sm font-black text-gray-900">
                                {table.name}
                              </h4>
                              <p className="text-[10px] text-gray-500">
                                {table.capacity} seats
                              </p>
                            </button>
                          ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black text-gray-700">
                        Sub Table Name
                      </label>
                      <input
                        value={tempTableName}
                        onChange={(e) => setTempTableName(e.target.value)}
                        placeholder="e.g. 1A"
                        className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm font-bold outline-none focus:border-red-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black text-gray-700">
                        Seats
                      </label>
                      <input
                        value={tempCapacity}
                        onChange={(e) => setTempCapacity(e.target.value)}
                        placeholder="2"
                        type="number"
                        className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm font-bold outline-none focus:border-red-400"
                      />
                    </div>
                    <button
                      onClick={handleCreateSubTable}
                      className="h-9 w-full rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-xs font-black text-white shadow-lg transition active:scale-[0.99]"
                    >
                      Create Sub Table
                    </button>
                  </div>
                </div>
              )}

              {/* MERGE */}
              {floorAction === "MERGE" && (
                <div>
                  <button
                    onClick={() => setFloorAction("HOME")}
                    className="mb-3 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 shadow-sm"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <label className="mb-2 block text-xs font-black text-gray-700">
                    Select Tables to Merge
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
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
                              if (active)
                                setMergeTables((prev) =>
                                  prev.filter((t) => t.id !== table.id),
                                );
                              else setMergeTables((prev) => [...prev, table]);
                            }}
                            className={`relative rounded-lg border p-2.5 text-left transition ${active ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white"}`}
                          >
                            {active && (
                              <div className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[8px] font-black text-white">
                                ✓
                              </div>
                            )}
                            <h4 className="text-sm font-black text-gray-900">
                              {table.name}
                            </h4>
                            <p className="text-[10px] text-gray-500">
                              {table.capacity} seats
                            </p>
                          </button>
                        );
                      })}
                  </div>
                  {mergeTables.length > 0 && (
                    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-wide text-orange-600">
                        Preview
                      </p>
                      <h3 className="mt-0.5 text-lg font-black text-gray-900">
                        {mergeTables.map((t) => t.name).join("-")}
                      </h3>
                      <p className="text-[10px] text-gray-600">
                        Total:{" "}
                        {mergeTables.reduce((acc, t) => acc + t.capacity, 0)}{" "}
                        seats
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleCreateMergeTable}
                    className="mt-3 h-9 w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-xs font-black text-white shadow-lg transition active:scale-[0.99]"
                  >
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
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wide">
                      Selected Table
                    </p>
                    <h3 className="text-sm font-black text-gray-900 leading-tight">
                      {selectedTable.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedTable(null)}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-700 shadow-sm"
                  >
                    Change
                  </button>
                </div>

                {/* Ready-to-serve banner (mobile) */}
                {selectedTableColorState === "ready_to_serve" && (
                  <div className="xl:hidden shrink-0 mb-1.5 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      <p className="text-xs font-black text-blue-700">
                        Order ready in kitchen!
                      </p>
                    </div>
                    <button
                      onClick={handleMarkDelivered}
                      className="rounded-lg bg-blue-500 px-3 py-1.5 text-[11px] font-black text-white shadow-sm transition hover:bg-blue-600 active:scale-95"
                    >
                      Mark Delivered
                    </button>
                  </div>
                )}

                {/* Menu section */}
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

                {/* Mobile action bar */}
                <div className="xl:hidden shrink-0 mt-1.5 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wide">
                        {tableOrders.length > 0
                          ? `${tableOrders.length} KOT · Table total`
                          : "New order"}
                      </p>
                      <p className="text-sm font-black text-gray-900">
                        {totalItems > 0 && <span>{totalItems} items · </span>}
                        <span className="text-red-600">
                          ₹
                          {tableOrders.reduce(
                            (s, o) => s + (o.totalAmount || 0),
                            0,
                          ) + grandTotal}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={handleSaveOrder}
                        disabled={loading || !cartItems.length}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm disabled:opacity-50"
                      >
                        {loading ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setStep("CART")}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-600"
                      >
                        Cart
                      </button>
                      {canCheckout && tableOrders.length > 0 && (
                        <button
                          onClick={() => setStep("CUSTOMER")}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600"
                        >
                          Bill
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT — DESKTOP ORDER PANEL */}
              <div className="hidden xl:flex xl:w-[240px] xl:shrink-0 xl:flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {/* Ready-to-serve banner (desktop) */}
                {selectedTableColorState === "ready_to_serve" && (
                  <div className="shrink-0 border-b border-blue-200 bg-blue-50 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      <p className="text-[11px] font-black text-blue-700">
                        Ready in kitchen!
                      </p>
                    </div>
                    <button
                      onClick={handleMarkDelivered}
                      className="rounded-lg bg-blue-500 px-2.5 py-1 text-[10px] font-black text-white transition hover:bg-blue-600"
                    >
                      Delivered
                    </button>
                  </div>
                )}
                {/* Header */}
                <div className="shrink-0 border-b border-gray-100 px-3 py-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                        Current Order
                      </p>
                      <h3 className="text-base font-black text-gray-900 mt-0.5">
                        {selectedTable.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedTable(null)}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-bold text-gray-700 transition hover:bg-gray-50"
                    >
                      Change
                    </button>
                  </div>
                </div>
                {/* Order history + current cart */}
                <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
                  {/* Past KOTs for this table */}
                  {tableOrders.length > 0 && (
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-gray-400">
                        Order History
                      </p>
                      <div className="space-y-1.5">
                        {tableOrders.map((order: any) => {
                          const s = order.kitchenStatus;
                          const badgeCls =
                            s === "DELIVERED"
                              ? "bg-emerald-100 text-emerald-700"
                              : s === "READY"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700";
                          const badgeTxt =
                            s === "DELIVERED"
                              ? "Delivered"
                              : s === "READY"
                                ? "Ready"
                                : "In Kitchen";
                          const items =
                            order.batches?.flatMap((b: any) => b.items) ?? [];
                          return (
                            <div
                              key={order.id}
                              className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-black text-gray-700">
                                  KOT #{order.orderNo ?? order.id}
                                </p>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => printKOT(order)}
                                    title="Print KOT"
                                    className="flex h-5 w-5 items-center justify-center rounded bg-gray-200 text-gray-600 transition hover:bg-red-100 hover:text-red-600"
                                  >
                                    <Printer className="h-3 w-3" />
                                  </button>
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-[8px] font-black ${badgeCls}`}
                                  >
                                    {badgeTxt}
                                  </span>
                                </div>
                              </div>
                              {items.map((item: any, i: number) => (
                                <p
                                  key={i}
                                  className="text-[10px] text-gray-500"
                                >
                                  {item.itemName} × {item.quantity}
                                </p>
                              ))}
                              <p className="mt-0.5 text-right text-[10px] font-black text-red-600">
                                ₹{order.totalAmount}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Current unsaved cart */}
                  {cartItems.length > 0 && (
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-gray-400">
                        New Order
                      </p>
                      <div className="space-y-1.5">
                        {cartItems.map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-2.5 py-2"
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
                    </div>
                  )}
                  {tableOrders.length === 0 && cartItems.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 p-6 text-center">
                      <span className="text-2xl">🛒</span>
                      <p className="mt-2 text-xs font-bold text-gray-500">
                        No items yet
                      </p>
                    </div>
                  )}
                </div>
                {/* Footer */}
                <div className="shrink-0 border-t border-gray-100 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-500">Table Total</p>
                      <p className="text-lg font-black text-red-600">
                        ₹
                        {tableOrders.reduce(
                          (s, o) => s + (o.totalAmount || 0),
                          0,
                        ) + grandTotal}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleSaveOrder}
                        disabled={loading || !cartItems.length}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                      >
                        {loading ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setStep("CART")}
                        className="rounded-lg bg-red-500 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-red-600"
                      >
                        Cart
                      </button>
                    </div>
                  </div>
                  {canCheckout && tableOrders.length > 0 && (
                    <button
                      onClick={() => setStep("CUSTOMER")}
                      className="w-full rounded-xl bg-emerald-500 py-2 text-xs font-black text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.99]"
                    >
                      Generate Bill · ₹
                      {tableOrders.reduce(
                        (s, o) => s + (o.totalAmount || 0),
                        0,
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === "CART" && (
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* Header */}
              <div className="shrink-0 border-b border-gray-100 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStep("MENU")}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <div>
                      <h2 className="text-sm font-black text-gray-900">
                        {selectedTable.name} — Orders
                      </h2>
                      <p className="text-[10px] text-gray-500">
                        {tableOrders.length} KOT
                        {tableOrders.length !== 1 ? "s" : ""} placed
                        {cartItems.length > 0 &&
                          ` · ${cartItems.length} unsaved items`}
                      </p>
                    </div>
                  </div>
                  {canCheckout && tableOrders.length > 0 && (
                    <button
                      onClick={() => setStep("CUSTOMER")}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-black text-white shadow-sm transition hover:bg-emerald-600"
                    >
                      Generate Bill
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-3">
                {/* ── Placed KOTs ── */}
                {tableOrders.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      Placed Orders
                    </p>
                    {tableOrders.map((order: any) => {
                      const ks = order.kitchenStatus ?? "PENDING";
                      const badgeCls =
                        ks === "DELIVERED"
                          ? "bg-emerald-100 text-emerald-700"
                          : ks === "READY"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700";
                      const badgeTxt =
                        ks === "DELIVERED"
                          ? "Delivered"
                          : ks === "READY"
                            ? "Ready"
                            : "In Kitchen";
                      const kotNo = order.orderNo ?? order.id;
                      const items =
                        order.batches?.flatMap((b: any) => b.items) ?? [];
                      const placedAt = new Date(
                        order.createdAt,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const doneAt = order.completedAt
                        ? new Date(order.completedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : null;
                      const delivAt =
                        ks === "DELIVERED"
                          ? new Date(order.updatedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : null;

                      return (
                        <div
                          key={order.id}
                          className="overflow-hidden rounded-xl border border-gray-200"
                        >
                          {/* KOT header */}
                          <div
                            className={`flex items-center justify-between px-3 py-2 ${
                              ks === "DELIVERED"
                                ? "bg-emerald-50"
                                : ks === "READY"
                                  ? "bg-blue-50"
                                  : "bg-amber-50"
                            }`}
                          >
                            <div>
                              <p className="text-xs font-black text-gray-900">
                                KOT #{kotNo}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                Ordered at {placedAt}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => printKOT(order)}
                                title="Print KOT"
                                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                              >
                                <Printer className="h-3 w-3" /> KOT
                              </button>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[9px] font-black ${badgeCls}`}
                              >
                                {badgeTxt}
                              </span>
                            </div>
                          </div>

                          {/* Items — with per-item cancel request */}
                          <div className="divide-y divide-gray-100">
                            {items.map((item: any) => {
                              const itemStatus = item.status ?? "PENDING";
                              const isCancelled = itemStatus === "CANCELLED";
                              const isCancelReq =
                                itemStatus === "CANCEL_REQUESTED";
                              return (
                                <div
                                  key={item.id}
                                  className={`flex items-center justify-between px-3 py-1.5 ${isCancelled ? "opacity-40" : ""}`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <p
                                      className={`text-xs font-semibold ${isCancelled ? "text-gray-400 line-through" : "text-gray-800"}`}
                                    >
                                      {item.itemName}
                                    </p>
                                    {isCancelReq && (
                                      <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[8px] font-black text-orange-600 shrink-0">
                                        Pending Cancel
                                      </span>
                                    )}
                                    {isCancelled && (
                                      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[8px] font-black text-red-500 shrink-0">
                                        Cancelled
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] text-gray-500">
                                      × {item.quantity}
                                    </span>
                                    <span className="text-xs font-black text-red-600">
                                      ₹
                                      {item.total ?? item.price * item.quantity}
                                    </span>
                                    {/* Cancel request button — only for active items */}
                                    {!isCancelled && !isCancelReq && (
                                      <button
                                        onClick={() =>
                                          handleRequestCancel(item.id)
                                        }
                                        title="Request cancellation"
                                        className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition hover:bg-red-100 hover:text-red-500"
                                      >
                                        <span className="text-[11px] font-black leading-none">
                                          ×
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Timeline + total */}
                          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-3 py-1.5">
                            <div className="flex items-center gap-2.5 text-[9px] text-gray-400">
                              <span>📋 {placedAt}</span>
                              {doneAt && (
                                <span className="text-blue-500">
                                  🍳 {doneAt}
                                </span>
                              )}
                              {delivAt && (
                                <span className="text-emerald-500">
                                  ✓ {delivAt}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-black text-red-600">
                              ₹{order.totalAmount}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Unsaved cart items ── */}
                {cartItems.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                      New Order — Not Yet Saved
                    </p>
                    <div className="overflow-hidden rounded-xl border-2 border-dashed border-amber-300">
                      {cartItems.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2.5 border-b border-amber-100 px-3 py-2 last:border-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-gray-900">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              ₹{item.price} each
                            </p>
                          </div>
                          <div className="flex items-center gap-1 rounded-lg bg-red-500 px-1 py-1 text-white">
                            <button
                              onClick={() => decreaseQty(item.id)}
                              className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20 active:scale-90"
                            >
                              <Minus className="h-2.5 w-2.5" strokeWidth={3} />
                            </button>
                            <span className="min-w-[18px] text-center text-xs font-black">
                              {cart[item.id]}
                            </span>
                            <button
                              onClick={() => increaseQty(item.id)}
                              className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20 active:scale-90"
                            >
                              <Plus className="h-2.5 w-2.5" strokeWidth={3} />
                            </button>
                          </div>
                          <p className="shrink-0 text-xs font-black text-red-600">
                            ₹{item.price * cart[item.id]}
                          </p>
                        </div>
                      ))}
                      <div className="flex items-center justify-between bg-amber-50 px-3 py-2">
                        <p className="text-xs text-amber-700 font-bold">
                          New order total
                        </p>
                        <p className="text-sm font-black text-red-600">
                          ₹{grandTotal}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await handleSaveOrder();
                        setStep("MENU");
                      }}
                      disabled={loading}
                      className="w-full rounded-xl bg-red-500 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-red-600 disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Save to Kitchen"}
                    </button>
                  </div>
                )}

                {/* Empty state */}
                {tableOrders.length === 0 && cartItems.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                    <span className="text-3xl">🛒</span>
                    <p className="mt-2 text-sm font-bold text-gray-500">
                      No orders yet
                    </p>
                    <p className="text-xs text-gray-400">
                      Add items from the menu
                    </p>
                  </div>
                )}
              </div>

              {/* Footer summary */}
              {(tableOrders.length > 0 || cartItems.length > 0) && (
                <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-500">Table Total</p>
                      <p className="text-xl font-black text-red-600">
                        ₹
                        {tableOrders.reduce(
                          (s, o) => s + (o.totalAmount || 0),
                          0,
                        ) + grandTotal}
                      </p>
                    </div>
                    {canCheckout && tableOrders.length > 0 && (
                      <button
                        onClick={() => setStep("CUSTOMER")}
                        className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-white shadow-lg transition hover:bg-emerald-600"
                      >
                        Generate Bill
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {step === "CUSTOMER" && (
            <CustomerSection
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerAddress={customerAddress}
              setCustomerAddress={setCustomerAddress}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              grand_Total={tableOrders.reduce(
                (s, o) => s + (o.totalAmount || 0),
                0,
              )}
              billingType="DINE_IN"
              setStep={setStep}
              onConfirm={handleGenerateBill}
              billing={branchData.billing}
            />
          )}
        </div>
      )}
    </div>
  );
}
