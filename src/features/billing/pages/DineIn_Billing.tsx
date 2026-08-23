import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";
import {
  saveRunningOrder,
  getRunningOrderByTable,
  updateRunningOrderStatus,
  closeRunningOrder,
  requestItemCancel,
  transferTable,
} from "@/services/runningOrderService";
import MenuSection from "@/components/billing/MenuSection";
import { useKitchenQueue } from "@/hooks/useKitchenQueue";
import CustomerSection from "@/components/billing/CustomerSection";
import AddOnSelectorModal from "@/components/billing/AddOnSelectorModal";
import {
  createRestaurantTable,
  deleteRestaurantTable,
} from "@/services/restaurantTableService";
import { createBill } from "@/services/billService";
import { Settings, ArrowLeft, X, Minus, Plus, Printer } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getQueuedItemsForTable, removeQueuedOrdersForTable, isNetworkError } from "@/utils/offlineQueue";
import { printReceiptWithSplit, type BillData } from "@/utils/printer";
import { StatusBadge } from "@/components/ui/status-badge";

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
  addOnMap: Record<number, any[]>;
};

// Stable reference so `cartAddOns[itemId] || EMPTY_ADDONS` doesn't hand out a
// fresh array identity every render for items with no add-ons.
const EMPTY_ADDONS: { name: string; price: number }[] = [];

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
  addOnMap,
}: Props) {
  // "" = every category collapsed. Starting closed shows the whole category
  // list at once, which is faster to scan than landing pre-scrolled inside
  // one open group. Empty string is also what MenuSection's accordion sends
  // back when an open category is tapped shut.
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<any>({});
  const [cartNotes, setCartNotes] = useState<Record<number, string>>({}); // itemId → special instructions
  const [cartAddOns, setCartAddOns] = useState<Record<number, { name: string; price: number }[]>>({});
  const [addOnModal, setAddOnModal] = useState<any>(null); // the product being added, while its add-on selector is open
  const [tableOrders, setTableOrders] = useState<any[]>([]); // all KOTs for selected table
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAppSelector((state) => state.auth);
  const [showModifyTables, setShowModifyTables] = useState(false);
  const [floorAction, setFloorAction] = useState<
    "HOME" | "SUB_TABLE" | "MERGE" | "TRANSFER"
  >("HOME");
  const [selectedParentTable, setSelectedParentTable] = useState<any>(null);
  const [tempTableName, setTempTableName] = useState("");
  const [tempCapacity, setTempCapacity] = useState("");
  const [mergeTables, setMergeTables] = useState<any[]>([]);
  const [transferFrom, setTransferFrom] = useState<any>(null);
  const [transferTo, setTransferTo] = useState<any>(null);
  const [transferring, setTransferring] = useState(false);

  const canCheckout = user?.role === "MANAGER" || user?.role === "CASHIER";
  const isOnline = useOnlineStatus();

  // Safety net: STAFF cannot reach the CUSTOMER (billing) step
  useEffect(() => {
    if (step === "CUSTOMER" && !canCheckout) {
      setStep("MENU");
    }
  }, [step, canCheckout]);

  // Groups the full menu by category for the accordion — "Best Sellers" is a
  // synthetic pseudo-category (aggregated top-sellers, not a real categoryId
  // group), so it's special-cased the same way the old single-category
  // filter used to.
  const productsByCategory = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const category of categories) {
      if (category.id === "BEST_SELLERS") {
        map.set(category.name, topSellingItems);
      } else {
        map.set(
          category.name,
          products.filter((p: any) => p.categoryId === category.id),
        );
      }
    }
    return map;
  }, [categories, products, topSellingItems]);

  // Merge products + topSellingItems (deduped) so items added from Best Sellers are found
  const allMenuItems = useMemo(
    () => [
      ...products,
      ...topSellingItems.filter((t) => !products.some((p) => p.id === t.id)),
    ],
    [products, topSellingItems],
  );

  const menuItemsById = useMemo(() => {
    const map = new Map<number, any>();
    for (const item of allMenuItems) map.set(item.id, item);
    return map;
  }, [allMenuItems]);

  // Kept in sync every render so increaseQty can read the *current* cart
  // synchronously without needing `cart` in its own dependency array —
  // that's what keeps increaseQty/decreaseQty/bumpCart referentially
  // stable across quantity changes, so React.memo on ProductCard actually
  // skips re-rendering every other card when one item's qty changes.
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  });

  // Add-ons apply once per cart line (not per unit) — the selector only
  // opens on the FIRST unit of an item that has attached groups. Bumping
  // the quantity of an item already in the cart just increments as before.
  const bumpCart = useCallback(
    (id: number) =>
      setCart((prev: any) => ({ ...prev, [id]: (prev[id] || 0) + 1 })),
    [],
  );

  const increaseQty = useCallback(
    (id: number) => {
      const alreadyInCart = !!cartRef.current[id];
      const groups = addOnMap[id];
      if (!alreadyInCart && groups?.length) {
        const product = menuItemsById.get(id);
        setAddOnModal(product || { id, name: "Item" });
        return;
      }
      bumpCart(id);
    },
    [addOnMap, menuItemsById, bumpCart],
  );

  const decreaseQty = useCallback(
    (id: number) =>
      setCart((prev: any) => {
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
      }),
    [],
  );

  const confirmAddOns = useCallback(
    (selected: { name: string; price: number }[]) => {
      setAddOnModal((current: any) => {
        if (!current) return null;
        if (selected.length) {
          setCartAddOns((prev) => ({ ...prev, [current.id]: selected }));
        }
        bumpCart(current.id);
        return null;
      });
    },
    [bumpCart],
  );

  const totalItems: number = Object.values(cart).reduce(
    (acc: any, qty: any) => acc + qty,
    0,
  ) as number;
  const cartItems = useMemo(
    () => allMenuItems.filter((p) => cart[p.id]),
    [allMenuItems, cart],
  );
  const addOnUnitTotal = (itemId: number) =>
    (cartAddOns[itemId] || EMPTY_ADDONS).reduce((s, a) => s + a.price, 0);
  const lineTotalFor = (item: any) =>
    (item.price + addOnUnitTotal(item.id)) * cart[item.id];
  const grandTotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + lineTotalFor(item), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cartItems, cartAddOns, cart],
  );

  // Live kitchen wait — lets a captain at the table quote a time, and see that
  // (say) the tandoor is backed up while the fryer is clear. Advisory only:
  // nothing here blocks or changes an order.
  const { estimate, targetTicketMinutes } = useKitchenQueue();
  const cartLines = useMemo(
    () => cartItems.map((i: any) => ({ menuItemId: i.id, qty: cart[i.id] })),
    [cartItems, cart],
  );
  const etaFor = useCallback(
    (menuItemId: number) => estimate(menuItemId, 1, cartLines),
    [estimate, cartLines],
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
                          setCartNotes({});
                          setCartAddOns({});
    } catch {
      /* silent */
    }
  };

  // Save current cart as a NEW KOT — each save = separate running order in kitchen
  const handleSaveOrder = async () => {
    if (!selectedTable || !cartItems.length || submitting) return;
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
      const response = await saveRunningOrder({
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        createdById: user.id,
        tableId: selectedTable.id,
        items,
        orderType: "DINE_IN",
      });
      if (response.success) {
        if (response.queuedOffline) {
          toast(
            "No connection — order saved offline, will sync automatically. Printing a kitchen copy now.",
            { icon: "📴", duration: 5000 },
          );
          printOfflineKOT(
            cartItems.map((item) => ({ name: item.name, quantity: cart[item.id] })),
            selectedTable.name,
          );
        }
        setCart({});
                          setCartNotes({});
                          setCartAddOns({});
        await fetchExistingOrder(selectedTable.id); // refresh order history
        await fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Effective total for billing — sums non-cancelled items across all committed KOTs
  const effectiveBillTotal = useMemo(
    () =>
      tableOrders.reduce((sum, order) => {
        const orderItems = order.batches?.flatMap((b: any) => b.items) ?? [];
        const active = orderItems
          .filter((i: any) => i.status !== "CANCELLED")
          .reduce((s: number, i: any) => s + (i.total ?? i.price * i.quantity), 0);
        return sum + active;
      }, 0),
    [tableOrders],
  );

  // Raw table total (all committed KOTs, unfiltered) — used alongside
  // `grandTotal` (the unsaved cart) in 3 places in the JSX below; computed
  // once per render instead of 3 separate inline `.reduce()` calls.
  const tableOrdersTotal = useMemo(
    () => tableOrders.reduce((s, o) => s + (o.totalAmount || 0), 0),
    [tableOrders],
  );

  // Placed-KOT timestamps, formatted once per order instead of recomputed
  // inline in JSX on every render (poll ticks, unrelated cart edits, etc).
  const tableOrdersWithTimes = useMemo(
    () =>
      tableOrders.map((order: any) => {
        const ks = order.kitchenStatus ?? "PENDING";
        return {
          order,
          placedAt: new Date(order.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          doneAt: order.completedAt
            ? new Date(order.completedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : null,
          delivAt:
            ks === "DELIVERED"
              ? new Date(order.updatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null,
        };
      }),
    [tableOrders],
  );

  // Navigate to billing — auto-save any unsaved cart items first
  const handleGoToBilling = async () => {
    if (cartItems.length > 0) {
      await handleSaveOrder();
    }
    setStep("CUSTOMER");
  };

  const resetAfterBill = async () => {
    setCart({});
    setCartNotes({});
    setCartAddOns({});
    setTableOrders([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setSelectedTable(null);
    setStep("MENU");
    await fetchData();
  };

  // Offline (or the "online" attempt just hit a genuine network error) —
  // build the bill directly from items already known locally (tableOrders is
  // already fetched into state), so it doesn't depend on the server having
  // this table's running orders. Also folds in any of this table's KOTs
  // still sitting in the offline queue (placed this same offline session,
  // never confirmed by the server) — otherwise a bill made right after an
  // offline order-save would miss the very items that order just added.
  const generateBillOffline = async (billingData: any) => {
    const activeItems = tableOrders
      .flatMap((o: any) => o.batches?.flatMap((b: any) => b.items) ?? [])
      .filter((i: any) => i.status !== "CANCELLED");
    const billItems = activeItems.map((i: any) => ({
      menuItemId: i.menuItemId,
      itemName: i.itemName,
      quantity: i.quantity,
      price: i.price,
      total: i.total,
      notes: i.notes,
      addOns: i.addOns,
    }));
    const queuedItems = getQueuedItemsForTable(selectedTable.id).map((i: any) => {
      const addOnTotal = (i.addOns || []).reduce((s: number, a: any) => s + (Number(a.price) || 0), 0);
      return {
        menuItemId: i.menuItemId,
        itemName: i.itemName,
        quantity: i.quantity,
        price: i.price,
        total: i.quantity * (i.price + addOnTotal),
        notes: i.notes,
        addOns: i.addOns,
      };
    });
    billItems.push(...queuedItems);

    const receiptMeta: Omit<BillData, "billNo"> = {
      shopName: branchData?.name || user?.restaurant?.name || "Restaurant",
      shopAddress: branchData?.address || user?.branch?.address,
      shopGstin: user?.restaurant?.gstNumber || user?.branch?.gstNumber,
      customerName: customerName || "Walk-in",
      billingType: "DINE_IN",
      paymentMethod: billingData.paymentMethod,
      items: billItems.map((i: any) => ({
        itemName: i.itemName, quantity: i.quantity, price: i.price,
        notes: i.notes, addOns: i.addOns,
      })),
      subtotal: billingData.subtotal,
      discountAmount: billingData.discountAmount,
      cgst: billingData.cgst,
      sgst: billingData.sgst,
      serviceChargeAmount: billingData.serviceChargeAmount,
      packingCharge: billingData.packingCharge,
      grandTotal: billingData.grandTotal,
      tipAmount: billingData.tipAmount,
    };

    const response = await createBill(
      {
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        createdById: user.id,
        tableId: selectedTable.id,
        customerName,
        customerPhone,
        paymentMethod: billingData.paymentMethod,
        orderType: "DINE_IN",
        items: billItems,
        subtotal: billingData.subtotal,
        discount: billingData.discountAmount,
        discountType: billingData.discountType,
        discountCode: billingData.discountCode,
        discountApprovedById: billingData.discountApprovedById,
        packingCharge: billingData.packingCharge,
        serviceCharge: billingData.serviceChargeAmount,
        gst: billingData.gstAmount,
        cgst: billingData.cgst,
        sgst: billingData.sgst,
        total: billingData.grandTotal,
        tipAmount: billingData.tipAmount,
      },
      receiptMeta,
    );

    if (response.success) {
      // This bill's items already include anything from this table's
      // queued-but-unsynced KOTs (folded in above) — remove them so they
      // don't also sync later as a separate, already-billed duplicate.
      removeQueuedOrdersForTable(selectedTable.id);
      if (response.queuedOffline) {
        toast(
          `No connection — bill saved offline as ${response.provisionalBillNo}. The official invoice will print automatically once this syncs.`,
          { icon: "📴", duration: 6000 },
        );
        if (billingData.shouldPrint) {
          const printed = await printReceiptWithSplit(
            { ...receiptMeta, billNo: response.provisionalBillNo! },
            billingData.splitCount || 1,
          );
          if (!printed) toast.error("Print failed — check the printer connection.");
        }
      }
      await resetAfterBill();
    }
  };

  // Close all running orders for this table and generate the bill
  const handleGenerateBill = async (billingData: any) => {
    if (!selectedTable || submitting) return;
    setSubmitting(true);
    try {
      // isOnline (navigator.onLine) is only ever a hint — it can be true
      // while the network is still unusable (captive portal, router up but
      // no upstream). So the "online" attempt still falls back to the same
      // offline path on a genuine network failure, instead of just erroring
      // and losing the bill.
      if (isOnline) {
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
            discountType: billingData.discountType,
            discountCode: billingData.discountCode,
            discountApprovedById: billingData.discountApprovedById,
            packingCharge: billingData.packingCharge,
            serviceCharge: billingData.serviceChargeAmount,
            gstAmount: billingData.gstAmount,
            cgst: billingData.cgst,
            sgst: billingData.sgst,
            finalAmount: billingData.grandTotal,
            tipAmount: billingData.tipAmount,
          });
          if (response.success) {
            if (billingData.shouldPrint && response.data) {
              const printed = await printReceiptWithSplit(
                {
                  shopName: branchData?.name || user?.restaurant?.name || "Restaurant",
                  shopAddress: branchData?.address || user?.branch?.address,
                  shopGstin: user?.restaurant?.gstNumber || user?.branch?.gstNumber,
                  billNo: response.data.billNo,
                  customerName: customerName || "Walk-in",
                  billingType: "DINE_IN",
                  paymentMethod: billingData.paymentMethod,
                  items: (response.data.items || []).map((i: any) => ({
                    itemName: i.itemName, quantity: i.quantity, price: i.price,
                    notes: i.notes, addOns: i.addOns,
                  })),
                  subtotal: billingData.subtotal,
                  discountAmount: billingData.discountAmount,
                  cgst: billingData.cgst,
                  sgst: billingData.sgst,
                  serviceChargeAmount: billingData.serviceChargeAmount,
                  packingCharge: billingData.packingCharge,
                  grandTotal: billingData.grandTotal,
                  tipAmount: billingData.tipAmount,
                },
                billingData.splitCount || 1,
              );
              if (!printed) toast.error("Print failed — check the printer connection.");
            }
            await resetAfterBill();
          }
          return;
        } catch (err: any) {
          if (!isNetworkError(err)) throw err;
          // Genuine network failure despite isOnline===true — fall through
          // to the offline path below instead of losing this bill.
        }
      }

      await generateBillOffline(billingData);
    } catch {
      toast.error("Couldn't generate the bill — please try again.");
    } finally {
      setSubmitting(false);
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
    if (!pw) {
      toast.error("Couldn't print the KOT — check that pop-ups aren't blocked.");
      return;
    }
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

  // Printed when an order is queued offline — the kitchen's own screen won't
  // see it until this device reconnects and syncs, so this is the only
  // physical ticket the kitchen gets in the meantime. Clearly marked so
  // nobody mistakes it for a normal KOT with a real order number.
  const printOfflineKOT = (items: any[], tableName: string) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const pw = window.open("", "", "width=400,height=600");
    if (!pw) {
      toast.error("Couldn't print the offline KOT — check that pop-ups aren't blocked.");
      return;
    }
    pw.document.write(`<html><head><title>OFFLINE KOT</title>
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
  <div style="font-size:10px;font-weight:bold;letter-spacing:2px">*** OFFLINE — NOT YET SYNCED ***</div>
  <div style="font-size:18px;font-weight:bold;margin-top:2px">${branchData?.name || "DineInk"}</div>
</div>
<div class="d"></div>
<table>
  <tr><td><b>Table</b></td><td style="text-align:right;font-size:16px;font-weight:bold">${tableName}</td></tr>
  <tr><td>Type</td><td style="text-align:right">DINE IN</td></tr>
  <tr><td>Time</td><td style="text-align:right">${time}</td></tr>
</table>
<div class="d"></div>
<table><tr><td class="n" style="font-size:11px;font-weight:bold">ITEM</td><td class="q" style="font-size:11px">QTY</td></tr></table>
<div class="d" style="margin:3px 0"></div>
<table><tbody>
${items.map((i: any) => `<tr><td class="n" style="font-size:14px;font-weight:bold;padding:3px 0">${i.name}</td><td class="q" style="font-size:18px">${i.quantity}</td></tr>`).join("")}
</tbody></table>
<div class="d"></div>
<div class="c" style="font-size:11px;font-weight:bold">*** KITCHEN COPY — WILL APPEAR ON KDS ONCE ONLINE ***</div>
</body></html>`);
    pw.document.close();
  };

  const handleCreateSubTable = async () => {
    if (!selectedParentTable || !tempTableName) return;
    try {
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't create the split table.");
    }
  };

  const handleCreateMergeTable = async () => {
    if (mergeTables.length < 2) return;
    try {
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't create the merged table.");
    }
  };

  const handleTransferTable = async () => {
    if (!transferFrom || !transferTo) return;
    setTransferring(true);
    try {
      const res = await transferTable({
        fromTableId: transferFrom.id,
        toTableId: transferTo.id,
        restaurantId: user.restaurantId,
        branchId: user.branchId,
      });
      if (res.success) {
        toast.success(`Moved ${transferFrom.name} to ${transferTo.name}`);
        setTransferFrom(null);
        setTransferTo(null);
        setFloorAction("HOME");
        setShowModifyTables(false);
        if (selectedTable?.id === transferFrom.id) setSelectedTable(null);
        await fetchData();
      } else {
        toast.error(res.message || "Couldn't transfer the table.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't transfer the table.");
    } finally {
      setTransferring(false);
    }
  };

  // Precomputed once per render (only recomputes when tables/runningOrders
  // actually change) instead of re-scanning runningOrders per table on every
  // one of the ~7 call sites below — O(tables + runningOrders) instead of
  // O(7 × tables × runningOrders).
  const tableColorMap = useMemo(() => {
    const ordersByTable = new Map<number, any[]>();
    for (const o of runningOrders as any[]) {
      if (o.tableId == null) continue;
      const list = ordersByTable.get(o.tableId);
      if (list) list.push(o);
      else ordersByTable.set(o.tableId, [o]);
    }
    const map = new Map<
      number,
      "available" | "in_kitchen" | "ready_to_serve" | "occupied"
    >();
    for (const table of tables as any[]) {
      const orders = ordersByTable.get(table.id) || [];
      if (orders.length === 0) {
        map.set(table.id, "available");
        continue;
      }
      if (
        orders.some(
          (o: any) =>
            !o.status ||
            o.status === "PENDING" ||
            o.status === "NEW" ||
            o.status === "PREPARING",
        )
      ) {
        map.set(table.id, "in_kitchen");
        continue;
      }
      if (orders.some((o: any) => o.status === "READY")) {
        map.set(table.id, "ready_to_serve");
        continue;
      }
      map.set(table.id, "occupied"); // all DELIVERED — customer eating, bill not closed
    }
    return map;
  }, [tables, runningOrders]);

  const getTableColorState = useCallback(
    (
      tableId: number,
    ): "available" | "in_kitchen" | "ready_to_serve" | "occupied" =>
      tableColorMap.get(tableId) ?? "available",
    [tableColorMap],
  );

  const selectedTableColorState =
    selectedTable && !selectedTable.isTemporary
      ? getTableColorState(selectedTable.id)
      : null;

  const handleMarkDelivered = async () => {
    if (!selectedTable) return;
    const readyOrders = runningOrders.filter(
      (o: any) => o.tableId === selectedTable.id && o.status === "READY",
    );
    const results = await Promise.allSettled(
      readyOrders.map((o: any) => updateRunningOrderStatus(o.id, "DELIVERED")),
    );
    const failedCount = results.filter((r) => r.status === "rejected").length;
    if (failedCount > 0) {
      toast.error(
        `Couldn't mark ${failedCount} of ${readyOrders.length} order(s) as delivered — please try again.`,
      );
    }
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
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          {/* TOP BAR */}
          <div className="shrink-0 border-b border-border px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black tracking-tight text-foreground">
                  Restaurant Floor
                </h2>
                <p className="text-[0.6875rem] text-muted-foreground">
                  Select a table to begin
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {/* STATUS BADGES */}
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-black text-emerald-700">
                  {availableCount} Avail
                </span>
                {inKitchenCount > 0 && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-black text-amber-700">
                    {inKitchenCount} Kitchen
                  </span>
                )}
                {readyToServeCount > 0 && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[0.6875rem] font-black text-blue-700 animate-pulse">
                    {readyToServeCount} Ready
                  </span>
                )}
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[0.6875rem] font-black text-red-700">
                  {occupiedCount} Occ
                </span>
                {tempCount > 0 && (
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[0.6875rem] font-black text-purple-700">
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
                    className="flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-red-600 active:scale-95"
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
                          setCartNotes({});
                          setCartAddOns({});
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
                          <h3 className="text-lg font-black tracking-tight text-foreground">
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
                          <p className="text-xs font-black text-foreground">
                            {table.capacity}
                          </p>
                          <p className="text-[7px] font-bold uppercase text-subtle-foreground">
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
            <div className="hidden xl:flex xl:w-[220px] shrink-0 flex-col border-l border-border overflow-y-auto">
              <div className="p-3 border-b border-border">
                <h3 className="text-xs font-black text-foreground">
                  Live Operations
                </h3>
                <p className="text-[0.6875rem] text-muted-foreground mt-0.5">
                  Floor activity
                </p>
              </div>
              <div className="p-3 space-y-3">
                {/* OCCUPANCY */}
                <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-3 text-white">
                  <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-red-100">
                    Occupancy
                  </p>
                  <h2 className="mt-1 text-3xl font-black">
                    {nonTempTables.length > 0
                      ? Math.round((occupiedCount / nonTempTables.length) * 100)
                      : 0}
                    %
                  </h2>
                  <p className="text-[0.6875rem] text-red-100 mt-0.5">
                    {occupiedCount} of {nonTempTables.length} tables
                  </p>
                </div>

                {/* ACTIVE TABLES */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-black text-foreground">
                      Active Tables
                    </h4>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[0.6875rem] font-black text-red-700">
                      {occupiedCount}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {tables
                      .filter((t) => !t.isTemporary && getTableColorState(t.id) !== "available")
                      .map((table) => (
                        <div
                          key={table.id}
                          className="rounded-xl border border-red-100 bg-red-50 px-2.5 py-2"
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-black text-foreground">
                              {table.name}
                            </h5>
                            <span className="text-[0.6875rem] font-bold text-red-600">
                              {table.capacity}s
                            </span>
                          </div>
                        </div>
                      ))}
                    {occupiedCount === 0 && (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted py-6">
                        <span className="text-xl">🍽</span>
                        <p className="mt-1.5 text-[0.6875rem] font-bold text-muted-foreground">
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
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />
          <div className="fixed bottom-0 right-0 z-50 flex flex-col overflow-hidden bg-white shadow-2xl h-[88vh] w-full rounded-t-2xl xl:top-0 xl:h-screen xl:w-[360px] xl:rounded-none xl:border-l xl:border-border">
            {/* HEADER */}
            <div className="shrink-0 bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-red-100">
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
                        <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-purple-500">
                          Split Billing
                        </p>
                        <h3 className="mt-0.5 text-sm font-black text-foreground">
                          Create Sub Table
                        </h3>
                        <p className="text-[0.6875rem] text-muted-foreground">
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
                        <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-orange-500">
                          Family Seating
                        </p>
                        <h3 className="mt-0.5 text-sm font-black text-foreground">
                          Merge Tables
                        </h3>
                        <p className="text-[0.6875rem] text-muted-foreground">
                          Combine multiple tables together
                        </p>
                      </div>
                      <span className="text-2xl">🪑</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setFloorAction("TRANSFER")}
                    className="w-full rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-3 text-left transition hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-blue-500">
                          Guests Moved Seats
                        </p>
                        <h3 className="mt-0.5 text-sm font-black text-foreground">
                          Transfer Table
                        </h3>
                        <p className="text-[0.6875rem] text-muted-foreground">
                          Move an active order to another table
                        </p>
                      </div>
                      <span className="text-2xl">🔄</span>
                    </div>
                  </button>

                  {/* TEMP TABLES LIST */}
                  <div className="pt-1">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-black text-foreground">
                        Temporary Tables
                      </h3>
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[0.6875rem] font-black text-purple-700">
                        {tempCount} active
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {tables
                        .filter((t) => t.isTemporary)
                        .map((table) => (
                          <div
                            key={table.id}
                            className="rounded-xl border border-border bg-muted p-3"
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
                                <h4 className="mt-1 text-base font-black text-foreground">
                                  {table.name}
                                </h4>
                                <p className="text-[0.6875rem] text-muted-foreground">
                                  Parent: {table.parentTableIds}
                                </p>
                              </div>
                              <span className="text-xs font-black text-foreground">
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
                                className="flex-1 rounded-lg bg-white px-2 py-1.5 text-xs font-black text-foreground shadow-sm border border-border"
                              >
                                Open
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await deleteRestaurantTable(table.id);
                                    await fetchData();
                                  } catch (err: any) {
                                    toast.error(err?.response?.data?.message || "Couldn't delete this table.");
                                  }
                                }}
                                className="rounded-lg border border-red-100 bg-red-50 px-2 py-1.5 text-xs font-black text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      {tempCount === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted py-8">
                          <span className="text-2xl">🪑</span>
                          <p className="mt-2 text-xs font-black text-foreground">
                            No Temporary Tables
                          </p>
                          <p className="mt-0.5 text-[0.6875rem] text-subtle-foreground">
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
                    className="mb-3 flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-bold text-foreground shadow-sm"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-black text-foreground">
                        Select Parent Table
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {tables
                          .filter((t) => !t.isTemporary)
                          .map((table) => (
                            <button
                              key={table.id}
                              onClick={() => setSelectedParentTable(table)}
                              className={`rounded-lg border p-2.5 text-left transition ${selectedParentTable?.id === table.id ? "border-red-500 bg-red-50" : "border-border bg-white"}`}
                            >
                              <h4 className="text-sm font-black text-foreground">
                                {table.name}
                              </h4>
                              <p className="text-[0.6875rem] text-muted-foreground">
                                {table.capacity} seats
                              </p>
                            </button>
                          ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black text-foreground">
                        Sub Table Name
                      </label>
                      <input
                        value={tempTableName}
                        onChange={(e) => setTempTableName(e.target.value)}
                        placeholder="e.g. 1A"
                        className="h-9 w-full rounded-xl border border-border px-3 text-sm font-bold outline-none focus:border-red-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black text-foreground">
                        Seats
                      </label>
                      <input
                        value={tempCapacity}
                        onChange={(e) => setTempCapacity(e.target.value)}
                        placeholder="2"
                        type="number"
                        className="h-9 w-full rounded-xl border border-border px-3 text-sm font-bold outline-none focus:border-red-400"
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
                    className="mb-3 flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-bold text-foreground shadow-sm"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <label className="mb-2 block text-xs font-black text-foreground">
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
                            className={`relative rounded-lg border p-2.5 text-left transition ${active ? "border-orange-500 bg-orange-50" : "border-border bg-white"}`}
                          >
                            {active && (
                              <div className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[8px] font-black text-white">
                                ✓
                              </div>
                            )}
                            <h4 className="text-sm font-black text-foreground">
                              {table.name}
                            </h4>
                            <p className="text-[0.6875rem] text-muted-foreground">
                              {table.capacity} seats
                            </p>
                          </button>
                        );
                      })}
                  </div>
                  {mergeTables.length > 0 && (
                    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
                      <p className="text-[0.6875rem] font-black uppercase tracking-wide text-orange-600">
                        Preview
                      </p>
                      <h3 className="mt-0.5 text-lg font-black text-foreground">
                        {mergeTables.map((t) => t.name).join("-")}
                      </h3>
                      <p className="text-[0.6875rem] text-muted-foreground">
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

              {/* TRANSFER */}
              {floorAction === "TRANSFER" && (
                <div>
                  <button
                    onClick={() => {
                      setFloorAction("HOME");
                      setTransferFrom(null);
                      setTransferTo(null);
                    }}
                    className="mb-3 flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-bold text-foreground shadow-sm"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <label className="mb-1.5 block text-xs font-black text-foreground">
                    Move From (occupied table)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {tables
                      .filter((t) => !t.isTemporary && getTableColorState(t.id) !== "available")
                      .map((table) => (
                        <button
                          key={table.id}
                          onClick={() => setTransferFrom(table)}
                          className={`rounded-lg border p-2.5 text-left transition ${transferFrom?.id === table.id ? "border-blue-500 bg-blue-50" : "border-border bg-white"}`}
                        >
                          <h4 className="text-sm font-black text-foreground">
                            {table.name}
                          </h4>
                          <p className="text-[0.6875rem] text-muted-foreground">
                            {table.capacity} seats
                          </p>
                        </button>
                      ))}
                  </div>
                  {tables.filter((t) => !t.isTemporary && getTableColorState(t.id) !== "available").length === 0 && (
                    <p className="mt-2 text-xs text-subtle-foreground">
                      No occupied tables to transfer right now.
                    </p>
                  )}

                  <label className="mb-1.5 mt-4 block text-xs font-black text-foreground">
                    Move To (available table)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {tables
                      .filter((t) => !t.isTemporary && t.id !== transferFrom?.id && getTableColorState(t.id) === "available")
                      .map((table) => (
                        <button
                          key={table.id}
                          onClick={() => setTransferTo(table)}
                          className={`rounded-lg border p-2.5 text-left transition ${transferTo?.id === table.id ? "border-blue-500 bg-blue-50" : "border-border bg-white"}`}
                        >
                          <h4 className="text-sm font-black text-foreground">
                            {table.name}
                          </h4>
                          <p className="text-[0.6875rem] text-muted-foreground">
                            {table.capacity} seats
                          </p>
                        </button>
                      ))}
                  </div>

                  {transferFrom && transferTo && (
                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                      <p className="text-[0.6875rem] font-black uppercase tracking-wide text-blue-600">
                        Preview
                      </p>
                      <h3 className="mt-0.5 text-sm font-black text-foreground">
                        {transferFrom.name} → {transferTo.name}
                      </h3>
                    </div>
                  )}
                  <button
                    onClick={handleTransferTable}
                    disabled={!transferFrom || !transferTo || transferring}
                    className="mt-3 h-9 w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-xs font-black text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {transferring ? "Transferring…" : "Transfer Table"}
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
                <div className="xl:hidden shrink-0 mb-1.5 flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2 shadow-sm">
                  <div>
                    <p className="text-[0.6875rem] text-muted-foreground uppercase font-bold tracking-wide">
                      Selected Table
                    </p>
                    <h3 className="text-sm font-black text-foreground leading-tight">
                      {selectedTable.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedTable(null)}
                    className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-bold text-foreground shadow-sm"
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
                      className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-600 active:scale-95"
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
                    productsByCategory={productsByCategory}
                    activeCart={cart}
                    increaseQty={increaseQty}
                    decreaseQty={decreaseQty}
                    etaFor={etaFor}
                    targetMinutes={targetTicketMinutes}
                  />
                </div>

                {/* Mobile action bar */}
                <div className="xl:hidden shrink-0 mt-1.5 rounded-xl border border-border bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[0.6875rem] text-subtle-foreground uppercase font-bold tracking-wide">
                        {tableOrders.length > 0
                          ? `${tableOrders.length} KOT · Table total`
                          : "New order"}
                      </p>
                      <p className="text-sm font-black text-foreground">
                        {totalItems > 0 && <span>{totalItems} items · </span>}
                        <span className="text-red-600">
                          ₹{tableOrdersTotal + grandTotal}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={handleSaveOrder}
                        disabled={loading || submitting || !cartItems.length}
                        className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-foreground shadow-sm disabled:opacity-50"
                      >
                        {submitting ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setStep("CART")}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-600"
                      >
                        Cart
                      </button>
                      {canCheckout && tableOrders.length > 0 && (
                        <button
                          onClick={handleGoToBilling}
                          disabled={submitting}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
                        >
                          Bill
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT — DESKTOP ORDER PANEL */}
              <div className="hidden xl:flex xl:w-[240px] xl:shrink-0 xl:flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                {/* Ready-to-serve banner (desktop) */}
                {selectedTableColorState === "ready_to_serve" && (
                  <div className="shrink-0 border-b border-blue-200 bg-blue-50 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      <p className="text-xs font-black text-blue-700">
                        Ready in kitchen!
                      </p>
                    </div>
                    <button
                      onClick={handleMarkDelivered}
                      className="rounded-lg bg-blue-500 px-2.5 py-1 text-[0.6875rem] font-black text-white transition hover:bg-blue-600"
                    >
                      Delivered
                    </button>
                  </div>
                )}
                {/* Header */}
                <div className="shrink-0 border-b border-border px-3 py-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-subtle-foreground">
                        Current Order
                      </p>
                      <h3 className="text-base font-black text-foreground mt-0.5">
                        {selectedTable.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedTable(null)}
                      className="rounded-lg border border-border px-2 py-1 text-xs font-bold text-foreground transition hover:bg-muted"
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
                      <p className="mb-1 text-[0.6875rem] font-black uppercase tracking-widest text-subtle-foreground">
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
                              className="rounded-lg border border-border bg-muted px-2.5 py-2"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[0.6875rem] font-black text-foreground">
                                  KOT #{order.orderNo ?? order.id}
                                </p>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => printKOT(order)}
                                    title="Print KOT"
                                    className="flex h-5 w-5 items-center justify-center rounded bg-secondary text-muted-foreground transition hover:bg-red-100 hover:text-red-600"
                                  >
                                    <Printer className="h-3 w-3" />
                                  </button>
                                  <StatusBadge tone={badgeCls} size="sm">
                                    {badgeTxt}
                                  </StatusBadge>
                                </div>
                              </div>
                              {items.map((item: any) => (
                                <p
                                  key={item.id}
                                  className="text-[0.6875rem] text-muted-foreground"
                                >
                                  {item.itemName} × {item.quantity}
                                </p>
                              ))}
                              <p className="mt-0.5 text-right text-[0.6875rem] font-black text-red-600">
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
                      <p className="mb-1 text-[0.6875rem] font-black uppercase tracking-widest text-subtle-foreground">
                        New Order
                      </p>
                      <div className="space-y-1.5">
                        {cartItems.map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-lg border border-border bg-white px-2.5 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {item.name}
                              </p>
                              <p className="text-[0.6875rem] text-muted-foreground">
                                × {cart[item.id]}
                              </p>
                            </div>
                            <p className="ml-2 shrink-0 text-xs font-black text-red-600">
                              ₹{lineTotalFor(item)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {tableOrders.length === 0 && cartItems.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center">
                      <span className="text-2xl">🛒</span>
                      <p className="mt-2 text-xs font-bold text-muted-foreground">
                        No items yet
                      </p>
                    </div>
                  )}
                </div>
                {/* Footer */}
                <div className="shrink-0 border-t border-border p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[0.6875rem] text-muted-foreground">Table Total</p>
                      <p className="text-lg font-black text-red-600">
                        ₹{tableOrdersTotal + grandTotal}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleSaveOrder}
                        disabled={loading || submitting || !cartItems.length}
                        className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50"
                      >
                        {submitting ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setStep("CART")}
                        className="rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-600"
                      >
                        Cart
                      </button>
                    </div>
                  </div>
                  {canCheckout && tableOrders.length > 0 && (
                    <button
                      onClick={handleGoToBilling}
                      disabled={submitting}
                      className="w-full rounded-xl bg-emerald-500 py-2 text-xs font-black text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.99] disabled:opacity-50"
                    >
                      Generate Bill · ₹{effectiveBillTotal}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === "CART" && (
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              {/* Header */}
              <div className="shrink-0 border-b border-border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStep("MENU")}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition hover:bg-muted"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <div>
                      <h2 className="text-sm font-black text-foreground">
                        {selectedTable.name} — Orders
                      </h2>
                      <p className="text-[0.6875rem] text-muted-foreground">
                        {tableOrders.length} KOT
                        {tableOrders.length !== 1 ? "s" : ""} placed
                        {cartItems.length > 0 &&
                          ` · ${cartItems.length} unsaved items`}
                      </p>
                    </div>
                  </div>
                  {canCheckout && tableOrders.length > 0 && (
                    <button
                      onClick={handleGoToBilling}
                      disabled={submitting}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
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
                    <p className="text-[0.6875rem] font-black uppercase tracking-widest text-subtle-foreground">
                      Placed Orders
                    </p>
                    {tableOrdersWithTimes.map(({ order, placedAt, doneAt, delivAt }) => {
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

                      return (
                        <div
                          key={order.id}
                          className="overflow-hidden rounded-xl border border-border"
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
                              <p className="text-xs font-black text-foreground">
                                KOT #{kotNo}
                              </p>
                              <p className="text-[0.6875rem] text-muted-foreground">
                                Ordered at {placedAt}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => printKOT(order)}
                                title="Print KOT"
                                className="flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-[0.6875rem] font-bold text-foreground transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                              >
                                <Printer className="h-3 w-3" /> KOT
                              </button>
                              <StatusBadge tone={badgeCls} size="sm">
                                {badgeTxt}
                              </StatusBadge>
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
                                      className={`text-xs font-semibold ${isCancelled ? "text-subtle-foreground line-through" : "text-foreground"}`}
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
                                    <span className="text-[0.6875rem] text-muted-foreground">
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
                                        className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-subtle-foreground transition hover:bg-red-100 hover:text-red-500"
                                      >
                                        <span className="text-xs font-black leading-none">
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
                          <div className="flex items-center justify-between border-t border-border bg-muted px-3 py-1.5">
                            <div className="flex items-center gap-2.5 text-[0.6875rem] text-subtle-foreground">
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
                    <p className="text-[0.6875rem] font-black uppercase tracking-widest text-amber-600">
                      New Order — Not Yet Saved
                    </p>
                    <div className="overflow-hidden rounded-xl border-2 border-dashed border-amber-300">
                      {cartItems.map((item: any) => (
                        <div
                          key={item.id}
                          className="border-b border-amber-100 px-3 py-2 last:border-0"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-foreground">
                                {item.name}
                              </p>
                              <p className="text-[0.6875rem] text-muted-foreground">
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
                              ₹{lineTotalFor(item)}
                            </p>
                          </div>
                          {(cartAddOns[item.id]?.length || 0) > 0 && (
                            <p className="mt-1 text-[0.6875rem] font-semibold text-violet-600">
                              + {cartAddOns[item.id].map((a) => a.name).join(", ")}
                            </p>
                          )}
                          <input
                            value={cartNotes[item.id] || ""}
                            onChange={(e) =>
                              setCartNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            placeholder="Add note (e.g. no onions)"
                            className="mt-1.5 w-full rounded-lg border border-border bg-white px-2 py-1 text-[0.6875rem] outline-none transition focus:border-red-300"
                          />
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
                    <p className="mt-2 text-sm font-bold text-muted-foreground">
                      No orders yet
                    </p>
                    <p className="text-xs text-subtle-foreground">
                      Add items from the menu
                    </p>
                  </div>
                )}
              </div>

              {/* Footer summary */}
              {(tableOrders.length > 0 || cartItems.length > 0) && (
                <div className="shrink-0 border-t border-border bg-white px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[0.6875rem] text-muted-foreground">Table Total</p>
                      <p className="text-xl font-black text-red-600">
                        ₹{tableOrdersTotal + grandTotal}
                      </p>
                    </div>
                    {canCheckout && tableOrders.length > 0 && (
                      <button
                        onClick={handleGoToBilling}
                        disabled={submitting}
                        className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-white shadow-lg transition hover:bg-emerald-600 disabled:opacity-50"
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
              grand_Total={effectiveBillTotal}
              billingType="DINE_IN"
              setStep={setStep}
              onConfirm={handleGenerateBill}
              billing={branchData.billing}
              loading={submitting}
            />
          )}
        </div>
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
