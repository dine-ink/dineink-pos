import { useEffect, useRef, useState } from "react";
import {
  User, Phone, MapPin, Wallet, Percent, ShoppingBag, Info, ArrowLeft, CheckCircle, Printer,
  Tag, Lock, Star, Clock, QrCode,
} from "lucide-react";
import { validateDiscountCode } from "@/services/discountService";
import { verifyManagerOverride } from "@/services/authService";
import { lookupCustomerByPhone } from "@/services/customerService";
import { api } from "@/services/api";
import { useAppSelector } from "@/store/hooks";
import { formatCurrency, formatShortDate } from "@/utils/format";
import { isNetworkError } from "@/utils/offlineQueue";

type Props = {
  customerName: string; setCustomerName: any;
  customerPhone: string; setCustomerPhone: any;
  customerAddress: string; setCustomerAddress: any;
  grand_Total: number; billingType: string;
  orderTypeOptions?: { key: string; label: string }[];
  selectedOrderType?: string; setSelectedOrderType?: any;
  setStep: any; billing: any; onConfirm: any;
  loading?: boolean;
};

export default function CustomerSection({
  customerName, setCustomerName,
  customerPhone, setCustomerPhone,
  customerAddress, setCustomerAddress,
  grand_Total, billing, billingType, setStep, onConfirm, loading = false,
  orderTypeOptions, selectedOrderType, setSelectedOrderType,
}: Props) {
  const { user } = useAppSelector((state) => state.auth);
  const [subtotal] = useState<number>(grand_Total);
  // Customer recognition: as soon as a full phone number is typed, look up
  // whether they've ordered before — surfaces visit history instead of
  // every guest starting from a blank slate, and auto-fills their name.
  const [returningCustomer, setReturningCustomer] = useState<{
    name: string; visits: number; spend: number; lastVisit: string | null; preferredOrderType: string | null;
  } | null>(null);
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false);
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lookedUpPhoneRef = useRef<string | null>(null);
  // ETA hint for staff: a quiet, one-time (non-polling) fetch of the
  // predicted ready time for whatever order type is currently active —
  // this is a checkout screen the cashier is on briefly, so no need to
  // keep it fresh while they're standing here.
  const [etaPrediction, setEtaPrediction] = useState<{
    predictedMinutes: number; historicalAvgMinutes: number; sampleSize: number; note?: string;
  } | null>(null);
  const currentOrderType = selectedOrderType || billingType;
  const etaOrderType = currentOrderType === "DINE_IN" ? "DINE_IN" : "TAKEAWAY";
  // Flexible discounts: a manual % or flat ₹ amount, or a pre-configured
  // coupon code (which overrides manual entry while applied).
  const [discountMode, setDiscountMode] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [couponCode, setCouponCode] = useState("");
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: string; value: number; discountAmount: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [managerPassword, setManagerPassword] = useState("");
  const [managerApproval, setManagerApproval] = useState<{ approverId: number; approverName: string } | null>(null);
  const [managerError, setManagerError] = useState("");
  const [verifyingManager, setVerifyingManager] = useState(false);
  const [packingCharge, setPackingCharge] = useState<number>(0);
  const [roundOff, setRoundOff] = useState(true);
  const [applyServiceCharge, setApplyServiceCharge] = useState(true);
  const [cashReceived, setCashReceived] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const tipsEnabled = billing?.enableTips ?? false;
  const [splitCount, setSplitCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState(
    billing.paymentMethods?.[0]?.toLowerCase() || "",
  );
  const paymentMethods = billing?.paymentMethods || [];
  // UPI QR: fetched once per checkout session, the first time the cashier
  // selects UPI as the payment method — not polled, and not refetched on
  // every toggle back to UPI (a failed/unconfigured branch just hides the
  // QR card rather than showing a broken image or a scary error).
  const [upiQr, setUpiQr] = useState<{
    upiId: string; displayName: string; qrCodeDataUrl: string; upiLink: string;
  } | null>(null);
  const [upiQrLoading, setUpiQrLoading] = useState(false);
  const [upiQrUnavailable, setUpiQrUnavailable] = useState(false);
  const upiQrFetchedRef = useRef(false);

  const discountAmount = appliedCoupon
    ? appliedCoupon.discountAmount
    : discountMode === "FIXED"
      ? Math.min(Number(discountValue) || 0, subtotal)
      : (subtotal * (Number(discountValue) || 0)) / 100;
  // Coupons are pre-configured by the owner, so they skip the approval
  // gate — only a manually-entered discount above the branch's threshold
  // needs a manager's say-so, the same way refunds/voids already do.
  const discountApprovalThreshold = billing?.discountApprovalThreshold ?? 20;
  const discountPercentOfSubtotal = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
  const needsManagerApproval =
    !appliedCoupon && discountAmount > 0 && discountPercentOfSubtotal > discountApprovalThreshold;
  const discountLocked = needsManagerApproval && !managerApproval;
  const packing = Number(packingCharge) || 0;
  const gstPercentage = billing?.gstPercentage || 0;
  const serviceChargePercentage = billing?.serviceCharge || 0;
  const serviceChargeAmount = applyServiceCharge
    ? ((subtotal - discountAmount + packing) * serviceChargePercentage) / 100
    : 0;
  const taxableAmount = subtotal - discountAmount + packing + serviceChargeAmount;

  // includeGST = true  → GST is already IN item prices (inclusive). Extract for display, don't add to total.
  // includeGST = false → GST is on top of item prices (exclusive). Calculate and add to total.
  const isGSTInclusive = billing?.includeGST ?? false;
  const gstAmount = gstPercentage > 0
    ? isGSTInclusive
      ? taxableAmount * gstPercentage / (100 + gstPercentage)  // extract from price
      : (taxableAmount * gstPercentage) / 100                   // add on top
    : 0;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  // When inclusive, GST is already in taxableAmount — don't add again
  const totalBeforeRoundOff = isGSTInclusive ? taxableAmount : taxableAmount + gstAmount;
  const grandTotal = roundOff ? Math.round(totalBeforeRoundOff) : totalBeforeRoundOff;
  // Tip is deliberately kept out of grandTotal — it isn't restaurant revenue,
  // it's a pass-through to staff. finalPayable is what the guest actually
  // hands over; grandTotal (untouched) is still what gets taxed/reported.
  const finalPayable = grandTotal + tipAmount;
  const balance = finalPayable - (Number(cashReceived) || 0);
  // Split is for payment collection only — one real invoice still gets
  // created (same GST bill number for everyone); this just tells the group
  // how much each person owes so they can settle between themselves.
  const perPersonAmount = splitCount > 1 ? finalPayable / splitCount : finalPayable;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError("");
    try {
      const res = await validateDiscountCode(couponCode.trim(), subtotal);
      if (res.success) {
        setAppliedCoupon(res.data);
        setManagerApproval(null);
      } else {
        setCouponError(res.message || "Invalid discount code");
      }
    } catch (err: any) {
      setCouponError(err?.response?.data?.message || "Invalid discount code");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const handleVerifyManager = async () => {
    if (!managerPassword) return;
    setVerifyingManager(true);
    setManagerError("");
    try {
      const res = await verifyManagerOverride(managerPassword);
      if (res.success) {
        setManagerApproval(res.data);
        setManagerPassword("");
      } else {
        setManagerError(res.message || "Incorrect manager password");
      }
    } catch (err: any) {
      setManagerError(
        isNetworkError(err)
          ? "No connection — manager approval needs internet access."
          : err?.response?.data?.message || "Incorrect manager password",
      );
    } finally {
      setVerifyingManager(false);
    }
  };

  useEffect(() => {
    if (paymentMethods.length > 0) setPaymentMethod(paymentMethods[0].toLowerCase());
  }, [paymentMethods]);

  // One-time fetch (not polling) of the predicted ETA for the current order
  // type — just a helpful hint for staff, so a failed/slow request should
  // silently leave the chip hidden rather than disrupt checkout.
  useEffect(() => {
    if (!user?.restaurantId || !user?.branchId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(
          `/analytics/${user.restaurantId}/${user.branchId}/eta-prediction`,
          { params: { orderType: etaOrderType } },
        );
        if (!cancelled && res.data?.success) {
          setEtaPrediction(res.data.data);
        }
      } catch {
        if (!cancelled) setEtaPrediction(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [etaOrderType, user?.restaurantId, user?.branchId]);

  // One-shot UPI QR fetch: fires the first time UPI becomes the selected
  // payment method, then never again for this component's lifetime — a
  // 400 (branch has no UPI ID configured yet) is swallowed quietly so the
  // QR card just stays hidden instead of surfacing an alarming error.
  useEffect(() => {
    if (paymentMethod !== "upi") return;
    if (upiQrFetchedRef.current) return;
    if (!user?.restaurantId || !user?.branchId) return;
    upiQrFetchedRef.current = true;
    let cancelled = false;
    (async () => {
      setUpiQrLoading(true);
      try {
        const res = await api.get(
          `/banking/upi/${user.restaurantId}/${user.branchId}/qr`,
        );
        if (!cancelled && res.data?.success) {
          setUpiQr(res.data.data);
          setUpiQrUnavailable(false);
        }
      } catch {
        if (!cancelled) {
          setUpiQr(null);
          setUpiQrUnavailable(true);
        }
      } finally {
        if (!cancelled) setUpiQrLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentMethod, user?.restaurantId, user?.branchId]);

  // Debounced lookup — waits for the cashier to stop typing, and only fires
  // once the number looks complete, so it doesn't spam the API on every
  // keystroke or block staff who never enter a phone at all.
  useEffect(() => {
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    const digits = customerPhone.replace(/\D/g, "");
    if (digits.length < 10 || !user?.restaurantId) {
      setReturningCustomer(null);
      lookedUpPhoneRef.current = null;
      return;
    }
    if (lookedUpPhoneRef.current === customerPhone) return;
    lookupTimerRef.current = setTimeout(async () => {
      setLookingUpCustomer(true);
      try {
        const res = await lookupCustomerByPhone(user.restaurantId, customerPhone);
        lookedUpPhoneRef.current = customerPhone;
        if (res.success && res.data) {
          setReturningCustomer(res.data);
          if (!customerName.trim()) setCustomerName(res.data.name);
        } else {
          setReturningCustomer(null);
        }
      } catch {
        setReturningCustomer(null);
      } finally {
        setLookingUpCustomer(false);
      }
    }, 500);
    return () => {
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerPhone, user?.restaurantId]);

  const paymentIcons: Record<string, string> = { cash: "💵", card: "💳", upi: "📱" };

  const inputClass = "flex h-8 items-center gap-2 rounded-lg border border-border bg-muted px-2.5 focus-within:border-red-400 focus-within:bg-white transition";

  const billingRow = (label: React.ReactNode, value: React.ReactNode, isTotal = false) => (
    <div className={`flex items-center justify-between px-2.5 py-2 xl:py-1 ${isTotal ? "bg-red-50" : "border-b border-border"}`}>
      <span className={`text-xs ${isTotal ? "font-black text-red-700" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-xs font-bold ${isTotal ? "text-red-600" : "text-foreground"}`}>{value}</span>
    </div>
  );

  const buildConfirmPayload = (shouldPrint: boolean) => ({
    paymentMethod, grandTotal, tipAmount, splitCount, cgst, sgst, gstAmount,
    serviceChargeAmount, discountAmount, packingCharge, shouldPrint,
    discountType: appliedCoupon ? appliedCoupon.type : discountMode === "FIXED" ? "FIXED" : "PERCENTAGE",
    discountCode: appliedCoupon?.code ?? null,
    discountApprovedById: managerApproval?.approverId ?? null,
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* HEADER */}
      <div className="shrink-0 flex items-center gap-2.5 border-b border-border bg-white px-3 py-2">
        <button onClick={() => setStep("CART")}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition hover:bg-muted">
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <div>
          <h2 className="text-sm font-black text-foreground">Checkout</h2>
          <p className="text-[0.6875rem] text-muted-foreground">Customer & payment details</p>
        </div>
        {etaPrediction && (
          etaPrediction.sampleSize >= 5 ? (
            <span className="ml-auto flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[0.6875rem] font-bold text-blue-700">
              <Clock className="h-3 w-3" /> Est. ready in ~{etaPrediction.predictedMinutes} min
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-[0.6875rem] font-medium text-subtle-foreground">
              <Clock className="h-3 w-3" /> Not enough data for an ETA estimate yet
            </span>
          )
        )}
      </div>

      {/* BODY */}
      <div className="flex-1 min-h-0 overflow-y-auto xl:overflow-hidden">
        <div className="p-2 xl:h-full xl:p-2.5">
          <div className="grid grid-cols-1 gap-2 xl:h-full xl:grid-cols-[minmax(0,1fr)_300px] xl:overflow-hidden">
            {/* LEFT */}
            <div className="space-y-2 xl:h-full xl:min-h-0 xl:space-y-1 xl:overflow-y-auto xl:pr-1">
              {/* CUSTOMER DETAILS */}
              <div className="rounded-xl border border-border bg-white p-3 shadow-sm xl:p-2">
                <h3 className="text-xs font-black text-foreground">Customer Details</h3>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.6875rem] font-bold text-foreground">Name</label>
                    <div className={inputClass}>
                      <User className="h-3 w-3 shrink-0 text-subtle-foreground" />
                      <input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer name" className="flex-1 bg-transparent text-xs outline-none placeholder:text-subtle-foreground" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.6875rem] font-bold text-foreground">Phone</label>
                    <div className={inputClass}>
                      <Phone className="h-3 w-3 shrink-0 text-subtle-foreground" />
                      <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Mobile number" type="tel" className="flex-1 bg-transparent text-xs outline-none placeholder:text-subtle-foreground" />
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="mb-1 block text-[0.6875rem] font-bold text-foreground">Address <span className="font-normal text-subtle-foreground">(optional)</span></label>
                  <div className={inputClass}>
                    <MapPin className="h-3 w-3 shrink-0 text-subtle-foreground" />
                    <input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Delivery address" className="flex-1 bg-transparent text-xs outline-none placeholder:text-subtle-foreground" />
                  </div>
                </div>
                {lookingUpCustomer && (
                  <p className="mt-2 text-[0.6875rem] font-bold text-subtle-foreground">Checking for returning customer...</p>
                )}
                {returningCustomer && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
                    <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />
                    <p className="text-xs font-bold text-amber-800">
                      Returning customer — {returningCustomer.visits} visit{returningCustomer.visits === 1 ? "" : "s"}
                      {" · "}{formatCurrency(returningCustomer.spend)} lifetime
                      {returningCustomer.lastVisit && (
                        <> · last visit {formatShortDate(returningCustomer.lastVisit)}</>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* BILLING DETAILS */}
              <div className="rounded-xl border border-border bg-white p-3 shadow-sm xl:p-2">
                <h3 className="mb-2 text-xs font-black text-foreground xl:mb-1">Billing Details</h3>
                <div className="rounded-xl border border-border overflow-hidden">
                  {billingRow(<span className="flex items-center gap-1.5"><Wallet className="h-3 w-3" /> Subtotal</span>, formatCurrency(subtotal))}
                  {discountAmount > 0 && billingRow(
                    <span className="flex items-center gap-1.5">
                      <Percent className="h-3 w-3" /> Discount
                      {appliedCoupon && <span className="rounded bg-emerald-100 px-1 py-0.5 text-[0.6875rem] font-black text-emerald-700">{appliedCoupon.code}</span>}
                    </span>,
                    <span className="text-xs font-bold text-red-500">-{formatCurrency(discountAmount)}</span>
                  )}
                  {billingRow(
                    <span className="flex items-center gap-1.5"><ShoppingBag className="h-3 w-3" /> Packing</span>,
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-6 w-16 items-center rounded-md border border-border bg-white px-1.5">
                        <input type="number" value={packingCharge} onChange={(e) => setPackingCharge(Number(e.target.value))}
                          className="w-full text-[0.6875rem] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      </div>
                      <span className="text-xs font-bold text-foreground">+{formatCurrency(packing)}</span>
                    </div>
                  )}
                  {serviceChargePercentage > 0 && billingRow(
                    <span className="flex items-center gap-1.5"><Wallet className="h-3 w-3" /> Service ({serviceChargePercentage}%)</span>,
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${applyServiceCharge ? "text-foreground" : "text-subtle-foreground line-through"}`}>
                        +{formatCurrency((subtotal - discountAmount + packing) * serviceChargePercentage / 100)}
                      </span>
                      <button
                        onClick={() => setApplyServiceCharge(!applyServiceCharge)}
                        className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-black transition ${
                          applyServiceCharge
                            ? "bg-red-100 text-red-600 hover:bg-red-200"
                            : "bg-secondary text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {applyServiceCharge ? "Opt Out" : "Opted Out"}
                      </button>
                    </div>
                  )}
                  {gstPercentage > 0 && billingRow(
                    `CGST (${gstPercentage / 2}%)${isGSTInclusive ? " incl." : ""}`,
                    `${isGSTInclusive ? "" : "+"}${formatCurrency(cgst)}`
                  )}
                  {gstPercentage > 0 && billingRow(
                    `SGST (${gstPercentage / 2}%)${isGSTInclusive ? " incl." : ""}`,
                    `${isGSTInclusive ? "" : "+"}${formatCurrency(sgst)}`
                  )}
                  {billingRow(
                    <span className="flex items-center gap-1.5"><Info className="h-3 w-3" /> Round Off</span>,
                    <button
                      onClick={() => setRoundOff(!roundOff)}
                      className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] font-black transition ${
                        roundOff
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-secondary text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {roundOff ? "✓ Applied" : "Off"}
                    </button>
                  )}
                  {billingRow(<span className="text-sm font-black text-red-700">Grand Total</span>, <span className="text-base font-black text-red-600">{formatCurrency(grandTotal)}</span>, true)}
                </div>

              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-1.5 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:pr-1">
              {/* TOTAL PAYABLE */}
              <div className="rounded-xl bg-gradient-to-br from-red-500 to-rose-600 p-4 text-white shadow-lg shadow-red-200 xl:p-2.5">
                <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-red-100">Total Payable</p>
                <h1 className="mt-1 text-4xl font-black xl:text-2xl">{formatCurrency(finalPayable)}</h1>
                {tipAmount > 0 && (
                  <p className="mt-1 text-xs text-red-100">{formatCurrency(grandTotal)} bill + {formatCurrency(tipAmount)} tip</p>
                )}
                {splitCount > 1 && (
                  <p className="mt-1 text-xs text-red-100">Split {splitCount} ways · {formatCurrency(perPersonAmount)} per person</p>
                )}
                {balance > 0 && cashReceived && (
                  <p className="mt-1 text-xs text-red-100">Balance: {formatCurrency(balance)}</p>
                )}
              </div>

              {/* DISCOUNT */}
              <div className="rounded-xl border border-border bg-white p-3 shadow-sm xl:p-2">
                <h3 className="mb-2 text-xs font-black text-foreground xl:mb-1">Discount</h3>

                {/* % / ₹ toggle — disabled while a coupon is applied */}
                <div className="flex items-center gap-1.5">
                  <div className="flex rounded-lg border border-border p-0.5">
                    {(["PERCENT", "FIXED"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setDiscountMode(mode)}
                        disabled={!!appliedCoupon}
                        className={`rounded-md px-2.5 py-1 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          discountMode === mode ? "bg-red-500 text-white" : "text-muted-foreground"
                        }`}
                      >
                        {mode === "PERCENT" ? "%" : "₹"}
                      </button>
                    ))}
                  </div>
                  <div className="flex h-8 flex-1 items-center rounded-lg border border-border bg-muted px-2.5 focus-within:border-red-400 focus-within:bg-white transition">
                    {discountMode === "FIXED" && <span className="mr-1 text-xs font-bold text-foreground">₹</span>}
                    <input
                      type="number"
                      value={appliedCoupon ? "" : discountValue || ""}
                      onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                      disabled={!!appliedCoupon}
                      placeholder={appliedCoupon ? "Coupon applied" : "0"}
                      className="w-full bg-transparent text-xs outline-none disabled:text-subtle-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {discountMode === "PERCENT" && !appliedCoupon && <span className="text-xs font-bold text-foreground">%</span>}
                  </div>
                </div>

                {/* Coupon code — collapsed behind a link until needed, since
                    most checkouts don't use one and the input+button row
                    otherwise costs space on every single order. */}
                <div className="mt-1.5">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-black text-emerald-700">
                        <Tag className="h-3 w-3" /> {appliedCoupon.code} applied
                      </span>
                      <button onClick={handleRemoveCoupon} className="text-[0.6875rem] font-bold text-emerald-700 underline">
                        Remove
                      </button>
                    </div>
                  ) : !showCouponInput ? (
                    <button
                      onClick={() => setShowCouponInput(true)}
                      className="flex items-center gap-1 text-[0.6875rem] font-bold text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
                    >
                      <Tag className="h-3 w-3" /> Have a coupon code?
                    </button>
                  ) : (
                    <div className="flex gap-1.5">
                      <div className="flex h-8 flex-1 items-center rounded-lg border border-border bg-muted px-2.5 focus-within:border-red-400 focus-within:bg-white transition">
                        <Tag className="mr-1.5 h-3 w-3 shrink-0 text-subtle-foreground" />
                        <input
                          autoFocus
                          value={couponCode}
                          onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                          placeholder="Coupon code"
                          className="w-full bg-transparent text-xs outline-none uppercase placeholder:normal-case placeholder:text-subtle-foreground"
                        />
                      </div>
                      <button
                        onClick={handleApplyCoupon}
                        disabled={validatingCoupon || !couponCode.trim()}
                        className="rounded-lg bg-foreground px-3 text-xs font-bold text-white disabled:opacity-40"
                      >
                        {validatingCoupon ? "..." : "Apply"}
                      </button>
                    </div>
                  )}
                  {couponError && <p className="mt-1 text-[0.6875rem] font-bold text-red-500">{couponError}</p>}
                </div>

                {/* Manager approval gate for large manual discounts */}
                {needsManagerApproval && (
                  <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5">
                    {managerApproval ? (
                      <p className="flex items-center gap-1.5 text-xs font-black text-emerald-700">
                        <CheckCircle className="h-3.5 w-3.5" /> Approved by {managerApproval.approverName}
                      </p>
                    ) : (
                      <>
                        <p className="flex items-center gap-1.5 text-[0.6875rem] font-black uppercase tracking-wide text-amber-700">
                          <Lock className="h-3 w-3" /> Manager approval required ({discountPercentOfSubtotal.toFixed(0)}% discount)
                        </p>
                        <div className="mt-1.5 flex gap-1.5">
                          <input
                            type="password"
                            value={managerPassword}
                            onChange={(e) => { setManagerPassword(e.target.value); setManagerError(""); }}
                            placeholder="Manager password"
                            className="h-8 flex-1 rounded-lg border border-amber-300 bg-white px-2.5 text-xs outline-none focus:border-amber-500"
                          />
                          <button
                            onClick={handleVerifyManager}
                            disabled={verifyingManager || !managerPassword}
                            className="rounded-lg bg-amber-500 px-3 text-xs font-bold text-white disabled:opacity-40"
                          >
                            {verifyingManager ? "..." : "Verify"}
                          </button>
                        </div>
                        {managerError && <p className="mt-1 text-[0.6875rem] font-bold text-red-500">{managerError}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* SPLIT BILL + ORDER TYPE — paired side by side at xl, both being
                  compact selector widgets, to save a row of vertical space */}
              <div className="flex flex-col gap-1.5 xl:flex-row">
                <div className="rounded-xl border border-border bg-white p-3 shadow-sm xl:flex-1 xl:p-2">
                  <h3 className="mb-2 text-xs font-black text-foreground xl:mb-1">Split Bill</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSplitCount((n) => Math.max(1, n - 1))}
                      disabled={splitCount <= 1}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-40"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center">
                      <p className="text-sm font-black text-foreground">
                        {splitCount === 1 ? "No split" : `${splitCount} ways`}
                      </p>
                      {splitCount > 1 && (
                        <p className="text-[0.6875rem] text-muted-foreground">{formatCurrency(perPersonAmount)} each</p>
                      )}
                    </div>
                    <button
                      onClick={() => setSplitCount((n) => Math.min(20, n + 1))}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground"
                    >
                      +
                    </button>
                  </div>
                  {splitCount > 1 && (
                    <p className="mt-2 text-[0.6875rem] text-subtle-foreground">
                      One invoice as usual — this only prints {splitCount} copies showing each person's share.
                    </p>
                  )}
                </div>

                {/* ORDER TYPE — picked right before the bill is generated */}
                {orderTypeOptions && orderTypeOptions.length > 1 && (
                  <div className="rounded-xl border border-border bg-white p-3 shadow-sm xl:flex-1 xl:p-2">
                    <h3 className="mb-2 text-xs font-black text-foreground xl:mb-1">Order Type</h3>
                    <div className="flex flex-col gap-1.5">
                      {orderTypeOptions.map((opt) => {
                        const active = selectedOrderType === opt.key;
                        return (
                          <button
                            key={opt.key}
                            onClick={() => setSelectedOrderType?.(opt.key)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                              active
                                ? "border-red-400 bg-red-50 text-red-600"
                                : "border-border bg-white text-muted-foreground hover:border-input"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* TIP */}
              {tipsEnabled && (
                <div className="rounded-xl border border-border bg-white p-3 shadow-sm xl:p-2">
                  <h3 className="mb-2 text-xs font-black text-foreground xl:mb-1">Add Tip</h3>
                  <div className="flex items-center gap-1.5">
                    {[0, 5, 10, 15].map((pct) => {
                      const amount = pct === 0 ? 0 : Math.round((grandTotal * pct) / 100);
                      const active = pct === 0 ? tipAmount === 0 : tipAmount === amount;
                      return (
                        <button
                          key={pct}
                          onClick={() => setTipAmount(amount)}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                            active ? "border-red-400 bg-red-50 text-red-600" : "border-border bg-white text-muted-foreground hover:border-input"
                          }`}
                        >
                          {pct === 0 ? "None" : `${pct}%`}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex h-8 items-center rounded-lg border border-border bg-muted px-2.5 focus-within:border-red-400 focus-within:bg-white transition">
                    <span className="mr-1 text-xs font-bold text-foreground">₹</span>
                    <input
                      type="number"
                      value={tipAmount || ""}
                      onChange={(e) => setTipAmount(Number(e.target.value) || 0)}
                      placeholder="Custom tip amount"
                      className="flex-1 bg-transparent text-xs outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              )}

              {/* PAYMENT METHOD */}
              <div className="rounded-xl border border-border bg-white p-3 shadow-sm xl:p-2">
                <h3 className="mb-2 text-xs font-black text-foreground xl:mb-1">Payment Method</h3>
                <div className="space-y-1.5 xl:space-y-1">
                  {paymentMethods.map((method: string) => {
                    const value = method.toLowerCase();
                    const active = paymentMethod === value;
                    const icon = paymentIcons[value] || "💰";
                    return (
                      <label key={method} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition xl:p-1.5 ${active ? "border-red-400 bg-red-50" : "border-border bg-white hover:border-input"}`}>
                        <input type="radio" checked={active} onChange={() => setPaymentMethod(value)} className="hidden" />
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg xl:h-6 xl:w-6 xl:text-sm ${active ? "bg-red-100" : "bg-secondary"}`}>{icon}</div>
                        <p className="flex-1 text-xs font-bold text-foreground">{method}</p>
                        {active && <CheckCircle className="h-4 w-4 shrink-0 text-red-500" />}
                      </label>
                    );
                  })}
                </div>

                {/* UPI QR — only while UPI is the selected method; purely
                    informational, doesn't feed into any total/calculator */}
                {paymentMethod === "upi" && (
                  <div className="mt-2 rounded-lg border border-border bg-muted p-2.5">
                    {upiQrLoading ? (
                      <p className="text-[0.6875rem] font-bold text-subtle-foreground">Loading UPI QR...</p>
                    ) : upiQr ? (
                      <div className="flex flex-col items-center gap-1">
                        <img
                          src={upiQr.qrCodeDataUrl}
                          alt="UPI QR code"
                          className="h-28 w-28 rounded-md border border-border bg-white p-1 xl:h-24 xl:w-24"
                        />
                        <p className="mt-0.5 flex items-center gap-1 text-xs font-black text-foreground">
                          <QrCode className="h-3 w-3" /> {upiQr.displayName}
                        </p>
                        <p className="text-[0.6875rem] font-medium text-muted-foreground">{upiQr.upiId}</p>
                        <p className="text-[0.6875rem] text-subtle-foreground">Scan with any UPI app to pay</p>
                      </div>
                    ) : upiQrUnavailable ? (
                      <p className="text-center text-[0.6875rem] font-medium text-subtle-foreground">
                        UPI QR not configured for this branch
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              {/* CASH RECEIVED & BALANCE */}
              <div className="rounded-xl border border-border bg-white p-3 shadow-sm xl:p-2">
                <h3 className="mb-2 text-xs font-black text-foreground xl:mb-1">Cash Payment</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[0.6875rem] font-bold text-foreground">
                      Cash Received <span className="font-normal text-subtle-foreground">(opt)</span>
                    </label>
                    <div className="flex h-8 items-center rounded-lg border-2 border-red-300 bg-white px-2.5 focus-within:border-red-500 transition">
                      <span className="mr-1 text-xs font-bold text-foreground">₹</span>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="Amount"
                        className="flex-1 bg-transparent text-xs outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.6875rem] font-bold text-foreground">Balance Due</label>
                    <div className="flex h-8 items-center rounded-lg bg-emerald-50 px-2.5">
                      <span className="text-sm font-black text-emerald-700">
                        {balance > 0 ? formatCurrency(balance) : formatCurrency(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM — laptop/monitor: pinned footer so it's always visible, no page scroll needed */}
      <div className="hidden shrink-0 flex-col gap-1.5 border-t border-border bg-white p-2.5 xl:flex">
        {discountLocked && (
          <p className="text-center text-[0.6875rem] font-bold text-amber-600">Manager approval required to confirm this discount</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(buildConfirmPayload(false))}
            disabled={loading || discountLocked}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-input bg-white text-xs font-bold text-foreground transition hover:bg-muted active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <CheckCircle className="h-4 w-4" />
            {loading ? "..." : "Confirm"}
          </button>
          <button
            onClick={() => onConfirm(buildConfirmPayload(true))}
            disabled={loading || discountLocked}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-xs font-black text-white shadow-xl shadow-red-200 transition hover:shadow-2xl active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Printer className="h-4 w-4" />
            {loading ? "Placing..." : "Confirm + Print"}
          </button>
        </div>
      </div>

      {/* MOBILE CONFIRM */}
      <div className="xl:hidden shrink-0 flex-col border-t border-border bg-white p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex gap-1.5">
        {discountLocked && (
          <p className="text-center text-[0.6875rem] font-bold text-amber-600">Manager approval required to confirm this discount</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(buildConfirmPayload(false))}
            disabled={loading || discountLocked}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-input bg-white text-xs font-bold text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <CheckCircle className="h-4 w-4" />
            {loading ? "..." : "Confirm"}
          </button>
          <button
            onClick={() => onConfirm(buildConfirmPayload(true))}
            disabled={loading || discountLocked}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-xs font-black text-white shadow-lg shadow-red-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Printer className="h-4 w-4" />
            {loading ? "Placing..." : `Print · ${formatCurrency(finalPayable)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
