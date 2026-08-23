import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";
import { MagnifyingGlassIcon, PrinterIcon } from "@heroicons/react/24/solid";
import PageLoader from "@/components/ui/PageLoader";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/services/api";
import { cancelBill, refundBill } from "@/services/runningOrderService";
import { createBill } from "@/services/billService";
import { getSavedPrinter, printReceipt, type BillData } from "@/utils/printer";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { isNetworkError } from "@/utils/offlineQueue";
import { formatCurrency, formatTime } from "@/utils/format";

const TYPE_BADGE: Record<string, string> = {
  DINE_IN: "bg-blue-100 text-blue-700",
  SWIGGY: "bg-orange-100 text-orange-700",
  ZOMATO: "bg-red-100 text-red-700",
  TAKE_AWAY: "bg-purple-100 text-purple-700",
};
const getTypeBadge = (t: string) => TYPE_BADGE[t] || "bg-secondary text-secondary-foreground";
const getPayBadge = (s: string) =>
  s === "PAID"
    ? "bg-emerald-100 text-emerald-700"
    : s === "PARTIAL"
      ? "bg-yellow-100 text-yellow-700"
      : s === "CANCELLED"
        ? "bg-secondary text-muted-foreground"
        : "bg-red-100 text-red-700";
const getStatusBadge = (s: string) =>
  s === "COMPLETED" ? "bg-emerald-100 text-emerald-700"
    : s === "CONFIRMED" ? "bg-indigo-100 text-indigo-700"
    : s === "READY" ? "bg-blue-100 text-blue-700"
    : "bg-yellow-100 text-yellow-700";
const customerDisplay = (order: any) =>
  typeof order.customer === "object" ? order.customer?.name || "Walk-in" : order.customer || "Walk-in";

type OrderRowProps = {
  order: any;
  canPrint: boolean;
  canRefund: boolean;
  canVoid: boolean;
  completing: number | null;
  voiding: number | null;
  onDirectPrint: (order: any) => void;
  onCompleteOrder: (order: any) => void;
  onOpenRefund: (order: any) => void;
  onVoidBill: (order: any) => void;
};

// Extracted + memoized so an unrelated re-render (e.g. the search box, or a
// different row's action) doesn't force every row to re-render — matters
// most here since both the mobile cards and desktop table mount the full
// list simultaneously (visibility toggled via CSS, not conditional render).
function OrderMobileCardBase({
  order, canPrint, canRefund, canVoid, completing, voiding,
  onDirectPrint, onCompleteOrder, onOpenRefund, onVoidBill,
}: OrderRowProps) {
  return (
    <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black text-foreground">{order.orderNo}</p>
          <p className="text-[0.6875rem] text-muted-foreground">
            {order.createdAt ? formatTime(order.createdAt) : "—"} · {order.table || "—"}
          </p>
        </div>
        <StatusBadge tone={getTypeBadge(order.orderType)} size="sm">
          {order.orderType?.replace("_", " ")}
        </StatusBadge>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <p className="text-[0.6875rem] text-muted-foreground">Customer</p>
          <p className="text-xs font-bold text-foreground">{customerDisplay(order)}</p>
        </div>
        <p className="text-lg font-black text-red-600">{formatCurrency(order.total)}</p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
        <div className="flex flex-wrap gap-1">
          <StatusBadge tone={getPayBadge(order.paymentStatus)} size="sm">
            {order.paymentStatus || "UNPAID"}
          </StatusBadge>
          <StatusBadge tone={getStatusBadge(order.orderStatus)} size="sm">
            {order.orderStatus}
          </StatusBadge>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDirectPrint(order)}
            disabled={!canPrint}
            title={!canPrint ? "No printer configured" : order.orderStatus === "COMPLETED" ? "Reprint Bill" : "Print Bill"}
            className={`flex h-11 w-11 items-center justify-center rounded-control transition ${canPrint ? "bg-red-50 text-primary hover:brightness-95" : "bg-secondary text-subtle-foreground cursor-not-allowed"}`}>
            <PrinterIcon className="h-4 w-4" />
          </button>
          {/* Complete / Refund / Void all move money, and they're pressed on a
              tablet mid-service — sized as real targets rather than the ~26px
              they were, and spaced so Void isn't a neighbour-miss from Refund. */}
          {order.source === "RUNNING_ORDER" && order.orderStatus !== "COMPLETED" && (
            <button onClick={() => onCompleteOrder(order)}
              disabled={completing === order.id}
              className="h-11 rounded-control bg-success px-3.5 text-xs font-bold text-success-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
              {completing === order.id ? "…" : "Complete"}
            </button>
          )}
          {canRefund && order.source === "BILL" && order.paymentStatus === "PAID" && (
            <button onClick={() => onOpenRefund(order)}
              className="h-11 rounded-control bg-warning px-3.5 text-xs font-bold text-warning-foreground transition hover:brightness-110">
              Refund
            </button>
          )}
          {canVoid && order.source === "BILL" && order.paymentStatus !== "CANCELLED" && (
            <button onClick={() => onVoidBill(order)}
              disabled={voiding === order.id}
              className="ml-1.5 h-11 rounded-control border border-destructive/40 bg-card px-3.5 text-xs font-bold text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60">
              {voiding === order.id ? "Voiding…" : "Void"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
const OrderMobileCard = memo(OrderMobileCardBase);

function OrderTableRowBase({
  order, index, canPrint, canRefund, canVoid, completing, voiding,
  onDirectPrint, onCompleteOrder, onOpenRefund, onVoidBill,
}: OrderRowProps & { index: number }) {
  return (
    <tr className={`border-b border-border transition hover:bg-red-50/50 ${index % 2 === 0 ? "bg-card" : "bg-muted/40"}`}>
      <td className="px-3 py-2 text-xs font-bold text-foreground">{order.orderNo}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{order.createdAt ? formatTime(order.createdAt) : "—"}</td>
      <td className="px-3 py-2 text-xs font-semibold text-foreground">{customerDisplay(order)}</td>
      <td className="px-3 py-2">
        <StatusBadge tone={getTypeBadge(order.orderType)} size="md">{order.orderType}</StatusBadge>
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{order.table || "—"}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{order.items?.length || 0} items</td>
      <td className="px-3 py-2">
        <StatusBadge tone="bg-emerald-100 text-emerald-700" size="md">{order.paymentMethod || "—"}</StatusBadge>
      </td>
      <td className="px-3 py-2 text-right">
        <p className="text-sm font-black text-red-600">{formatCurrency(order.total)}</p>
      </td>
      <td className="px-3 py-2">
        <StatusBadge tone={getPayBadge(order.paymentStatus)} size="md">{order.paymentStatus || "UNPAID"}</StatusBadge>
      </td>
      <td className="px-3 py-2">
        <StatusBadge tone={getStatusBadge(order.orderStatus)} size="md">{order.orderStatus}</StatusBadge>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onDirectPrint(order)}
            disabled={!canPrint}
            title={!canPrint ? "No printer configured" : order.orderStatus === "COMPLETED" ? "Reprint Bill" : "Print Bill"}
            className={`flex h-9 w-9 items-center justify-center rounded-control transition ${canPrint ? "bg-red-50 text-primary hover:brightness-95" : "bg-secondary text-subtle-foreground cursor-not-allowed"}`}>
            <PrinterIcon className="h-4 w-4" />
          </button>
          {order.source === "RUNNING_ORDER" && order.orderStatus !== "COMPLETED" && (
            <button onClick={() => onCompleteOrder(order)}
              disabled={completing === order.id}
              className="h-9 rounded-control bg-success px-3 text-xs font-bold text-success-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
              {completing === order.id ? "…" : "Complete"}
            </button>
          )}
          {canRefund && order.source === "BILL" && order.paymentStatus === "PAID" && (
            <button onClick={() => onOpenRefund(order)}
              className="h-9 rounded-control bg-warning px-3 text-xs font-bold text-warning-foreground transition hover:brightness-110">
              Refund
            </button>
          )}
          {canVoid && order.source === "BILL" && order.paymentStatus !== "CANCELLED" && (
            <button onClick={() => onVoidBill(order)}
              disabled={voiding === order.id}
              className="ml-1.5 h-9 rounded-control border border-destructive/40 bg-card px-3 text-xs font-bold text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60">
              {voiding === order.id ? "Voiding…" : "Void"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
const OrderTableRow = memo(OrderTableRowBase);

export default function OrderHistory() {
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPrinter, setHasPrinter] = useState(false);
  const [voiding, setVoiding] = useState<number | null>(null);
  const [completing, setCompleting] = useState<number | null>(null);
  const [refundOrder, setRefundOrder] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [voidTarget, setVoidTarget] = useState<any>(null);
  const { user } = useAppSelector((state) => state.auth);
  const isOnline = useOnlineStatus();
  // On web/laptop the browser print dialog handles USB printers — always enabled
  const isNative = Capacitor.isNativePlatform();
  const canPrint = !isNative || hasPrinter;
  // Voiding/refunding a paid bill is financially sensitive — managers only.
  const canVoid = user?.role === "MANAGER";
  const canRefund = user?.role === "MANAGER";

  useEffect(() => {
    setHasPrinter(!!getSavedPrinter());
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    try {
      setLoading(true);
      const res = await api.get(`/bills/${user.restaurantId}/${user.branchId}/branchwise`);
      if (res.data.success) setOrders(res.data.bills || []);
    } catch {
      // silently fail, orders stays as empty array
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId, user?.branchId]);

  useEffect(() => {
    if (user?.restaurantId && user?.branchId) fetchOrders();
  }, [user?.restaurantId, user?.branchId]);

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const v = search.toLowerCase();
    return orders.filter((o) => {
      const orderNo = String(o.orderNo || "").toLowerCase();
      const customer = typeof o.customer === "object"
        ? String(o.customer?.name || "").toLowerCase()
        : String(o.customer || "").toLowerCase();
      return orderNo.includes(v) || customer.includes(v);
    });
  }, [orders, search]);

  const completeOrderOffline = useCallback(async (order: any, resolvedCustomerName: string) => {
    // Offline — this order's item/tax breakdown is already in local state
    // (from getBillsService), so build the bill directly rather than
    // depending on a fresh server read of the RunningOrder.
    const billItems = (order.items || []).map((i: any) => ({
        menuItemId: i.menuItemId, itemName: i.itemName, quantity: i.quantity,
        price: i.price, total: i.total, notes: i.notes, addOns: i.addOns,
      }));
      const receiptMeta: Omit<BillData, "billNo"> = {
        shopName: user?.restaurant?.name || user?.branch?.name || "Restaurant",
        shopAddress: user?.restaurant?.address || user?.branch?.address,
        shopGstin: user?.restaurant?.gstNumber || user?.branch?.gstNumber,
        customerName: resolvedCustomerName || "Walk-in",
        billingType: order.orderType || "TAKE_AWAY",
        paymentMethod: order.paymentMethod || "CASH",
        items: billItems,
        subtotal: Number(order.subtotal || 0),
        discountAmount: Number(order.discount || 0),
        cgst: Number(order.cgst || 0),
        sgst: Number(order.sgst || 0),
        serviceChargeAmount: Number(order.serviceCharge || 0),
        packingCharge: Number(order.packingCharge || 0),
        grandTotal: Number(order.total || 0),
        tipAmount: Number(order.tipAmount || 0),
      };

      const response = await createBill(
        {
          restaurantId: user.restaurantId,
          branchId: user.branchId,
          createdById: user.id,
          runningOrderId: order.id,
          customerName: resolvedCustomerName,
          customerPhone: order.customerPhone,
          paymentMethod: order.paymentMethod || "CASH",
          orderType: order.orderType,
          items: billItems,
          subtotal: order.subtotal,
          discount: order.discount,
          packingCharge: order.packingCharge,
          serviceCharge: order.serviceCharge,
          gst: order.gst,
          cgst: order.cgst,
          sgst: order.sgst,
          total: order.total,
          tipAmount: order.tipAmount,
        },
        receiptMeta,
      );

    if (response.success) {
      if (response.queuedOffline) {
        toast(
          `No connection — order completed offline as ${response.provisionalBillNo}. The official invoice will print automatically once this syncs.`,
          { icon: "📴", duration: 6000 },
        );
      }
      fetchOrders();
    } else {
      toast.error((response as any).message || "Couldn't complete this order.");
    }
  }, [user, fetchOrders]);

  const handleCompleteOrder = useCallback(async (order: any) => {
    // Guards against the double-click/slow-refresh duplicate-billing bug —
    // a second click while the first is still in flight now no-ops here
    // instead of reaching the backend and creating a second Bill.
    if (completing === order.id) return;
    setCompleting(order.id);
    const resolvedCustomerName =
      typeof order.customer === "object" && order.customer !== null
        ? (order.customer as any)?.name || ""
        : (order.customer as string) || "";
    try {
      // isOnline (navigator.onLine) is only ever a hint — it can be true
      // while the network is still unusable. So the "online" attempt still
      // falls back to the offline path on a genuine network failure,
      // instead of just erroring and losing the completion.
      if (isOnline) {
        try {
          const res = await api.post(`/running-orders/closeRunningOrder`, {
            runningOrderId: order.id,
            customerName: resolvedCustomerName,
            customerPhone: order.customerPhone,
            paymentMethod: order.paymentMethod || "CASH",
            orderType: order.orderType,
          });
          if (res.data.success) fetchOrders();
          else toast.error(res.data.message || "Couldn't complete this order.");
          return;
        } catch (err: any) {
          if (!isNetworkError(err)) {
            toast.error(err?.response?.data?.message || "Couldn't complete this order — please try again.");
            return;
          }
          // Genuine network failure despite isOnline===true — fall through
          // to the offline path below instead of losing this completion.
        }
      }

      await completeOrderOffline(order, resolvedCustomerName);
    } catch {
      toast.error("Couldn't complete this order — please try again.");
    } finally {
      setCompleting(null);
    }
  }, [completing, isOnline, completeOrderOffline]);

  // Opens the confirm modal below rather than voiding immediately — replaces
  // the previous window.confirm (unstyled, can't be dismissed by tapping
  // outside, blocks the whole WebView on Android).
  const handleVoidBill = useCallback((order: any) => {
    setVoidTarget(order);
  }, []);

  const confirmVoidBill = async () => {
    if (!voidTarget) return;
    try {
      setVoiding(voidTarget.id);
      const res = await cancelBill(voidTarget.id);
      if (res.success) {
        setVoidTarget(null);
        fetchOrders();
      } else {
        toast.error(res.message || "Failed to void bill");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to void bill");
    } finally {
      setVoiding(null);
    }
  };

  const openRefundModal = useCallback((order: any) => {
    setRefundOrder(order);
    setRefundAmount("");
    setRefundReason("");
  }, []);

  const handleSubmitRefund = async () => {
    if (!refundOrder) return;
    const amount = Number(refundAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid refund amount.");
      return;
    }
    if (amount > Number(refundOrder.total || 0)) {
      toast.error(`Refund can't exceed ${formatCurrency(refundOrder.total)}.`);
      return;
    }
    try {
      setRefunding(true);
      const res = await refundBill(refundOrder.id, {
        amount,
        reason: refundReason || undefined,
        createdById: user?.id,
      });
      if (res.success) {
        toast.success(`Refunded ${formatCurrency(amount)}`);
        setRefundOrder(null);
        fetchOrders();
      } else {
        toast.error(res.message || "Couldn't process this refund.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't process this refund.");
    } finally {
      setRefunding(false);
    }
  };

  const handleDirectPrint = useCallback(async (order: any) => {
    const isReprint = order.orderStatus === "COMPLETED";
    const bill: BillData = {
      shopName: user?.restaurant?.name || user?.branch?.name || "Restaurant",
      shopAddress: user?.restaurant?.address || user?.branch?.address,
      shopGstin: user?.restaurant?.gstNumber || user?.branch?.gstNumber,
      billNo: order.orderNo || String(order.id),
      customerName: customerDisplay(order),
      billingType: order.orderType || "DINE_IN",
      paymentMethod: order.paymentMethod || "CASH",
      items: (order.items || []).map((item: any) => ({
        itemName: item.itemName || item.name || "",
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || (Number(item.total) / (Number(item.quantity) || 1)) || 0,
        notes: item.notes || undefined,
        addOns: item.addOns || undefined,
      })),
      subtotal: Number(order.subtotal || order.total || 0),
      discountAmount: Number(order.discount || 0),
      cgst: Number(order.cgst || 0),
      sgst: Number(order.sgst || 0),
      serviceChargeAmount: Number(order.serviceCharge || 0),
      packingCharge: Number(order.packingCharge || 0),
      grandTotal: Number(order.total || 0),
      tipAmount: Number(order.tipAmount || 0),
    };
    const ok = await printReceipt(bill);
    if (ok) {
      toast.success(isReprint ? "Bill reprinted" : "Bill sent to printer");
    } else {
      toast.error("Print failed — check the printer connection.");
    }
  }, [user]);

  if (loading) return <PageLoader />;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* HEADER */}
      <div className="shrink-0 border-b border-border bg-card px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-foreground">Order History</h1>
            <p className="text-xs text-muted-foreground tnum">{filteredOrders.length} records</p>
          </div>
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order or customer…"
              className="h-11 w-full rounded-control border border-input bg-card pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary" />
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
        {/* MOBILE CARDS */}
        <div className="space-y-2 xl:hidden">
          {filteredOrders.length === 0 && (
            <EmptyState icon={<span className="text-3xl">📋</span>} title="No orders found" className="py-12" />
          )}
          {filteredOrders.map((order) => (
            <OrderMobileCard
              key={`${order.source}-${order.id}`}
              order={order}
              canPrint={canPrint}
              canRefund={canRefund}
              canVoid={canVoid}
              completing={completing}
              voiding={voiding}
              onDirectPrint={handleDirectPrint}
              onCompleteOrder={handleCompleteOrder}
              onOpenRefund={openRefundModal}
              onVoidBill={handleVoidBill}
            />
          ))}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden overflow-hidden rounded-card border border-border bg-card shadow-sm xl:block">
          <div className="overflow-auto max-h-[calc(100vh-130px)]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-muted/60">
                <tr className="border-b border-border">
                  {["Order", "Time", "Customer", "Type", "Table", "Items", "Payment", "Amount", "Pay Status", "Order Status", "Actions"]
                    .map((h, i) => (
                      <th key={h} className={`px-3 py-2 text-[0.6875rem] font-black uppercase tracking-wider text-muted-foreground ${i === 7 ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <OrderTableRow
                    key={`${order.source}-${order.id}`}
                    order={order}
                    index={index}
                    canPrint={canPrint}
                    canRefund={canRefund}
                    canVoid={canVoid}
                    completing={completing}
                    voiding={voiding}
                    onDirectPrint={handleDirectPrint}
                    onCompleteOrder={handleCompleteOrder}
                    onOpenRefund={openRefundModal}
                    onVoidBill={handleVoidBill}
                  />
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <EmptyState icon={<span className="text-3xl">📋</span>} title="No orders found" className="py-16" />
            )}
          </div>
        </div>
      </div>

      {/* REFUND MODAL */}
      <ConfirmDialog
        open={!!refundOrder}
        title={refundOrder ? `Refund ${refundOrder.orderNo}` : ""}
        description={refundOrder ? `Bill total: ${formatCurrency(refundOrder.total)}` : null}
        showCloseIcon
        tone="warning"
        confirmLabel={refunding ? "Processing…" : "Confirm Refund"}
        confirmDisabled={refunding}
        onConfirm={handleSubmitRefund}
        onCancel={() => setRefundOrder(null)}
      >
        <label className="mt-3 block text-xs font-bold text-foreground">Refund Amount (₹)</label>
        <input
          type="number"
          value={refundAmount}
          onChange={(e) => setRefundAmount(e.target.value)}
          placeholder="0.00"
          className="mt-1 h-11 w-full rounded-control border border-input px-3 text-sm outline-none focus:border-primary"
        />

        <label className="mt-3 block text-xs font-bold text-foreground">Reason (optional)</label>
        <textarea
          value={refundReason}
          onChange={(e) => setRefundReason(e.target.value)}
          placeholder="e.g. customer complaint about a dish"
          rows={2}
          className="mt-1 w-full rounded-control border border-input px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </ConfirmDialog>

      {/* VOID CONFIRM MODAL */}
      <ConfirmDialog
        open={!!voidTarget}
        title={voidTarget ? `Void bill ${voidTarget.orderNo}?` : ""}
        description={voidTarget ? `${formatCurrency(voidTarget.total)} — this cannot be undone.` : null}
        confirmLabel={voidTarget && voiding === voidTarget.id ? "Voiding…" : "Void Bill"}
        confirmDisabled={!!voidTarget && voiding === voidTarget.id}
        onConfirm={confirmVoidBill}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
}
