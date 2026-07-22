import { useEffect, useState } from "react";
import {
  User, Phone, MapPin, Wallet, Percent, ShoppingBag, Info, ArrowLeft, CheckCircle, Printer,
} from "lucide-react";

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
  grand_Total, billing, setStep, onConfirm, loading = false,
  orderTypeOptions, selectedOrderType, setSelectedOrderType,
}: Props) {
  const [subtotal] = useState<number>(grand_Total);
  const [discount, setDiscount] = useState<number>(0);
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

  const discountAmount = (subtotal * discount) / 100;
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

  useEffect(() => {
    if (paymentMethods.length > 0) setPaymentMethod(paymentMethods[0].toLowerCase());
  }, [paymentMethods]);

  const paymentIcons: Record<string, string> = { cash: "💵", card: "💳", upi: "📱" };

  const inputClass = "flex h-8 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 focus-within:border-red-400 focus-within:bg-white transition";

  const billingRow = (label: React.ReactNode, value: React.ReactNode, isTotal = false) => (
    <div className={`flex items-center justify-between px-2.5 py-2 xl:py-1 ${isTotal ? "bg-red-50" : "border-b border-gray-100"}`}>
      <span className={`text-xs ${isTotal ? "font-black text-red-700" : "text-gray-600"}`}>{label}</span>
      <span className={`text-xs font-bold ${isTotal ? "text-red-600" : "text-gray-800"}`}>{value}</span>
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* HEADER */}
      <div className="shrink-0 flex items-center gap-2.5 border-b border-gray-100 bg-white px-3 py-2">
        <button onClick={() => setStep("CART")}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50">
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <div>
          <h2 className="text-sm font-black text-gray-900">Checkout</h2>
          <p className="text-[10px] text-gray-500">Customer & payment details</p>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 min-h-0 overflow-y-auto xl:overflow-hidden">
        <div className="p-2 xl:h-full xl:p-2.5">
          <div className="grid grid-cols-1 gap-2 xl:h-full xl:grid-cols-[1fr_280px] xl:overflow-hidden">
            {/* LEFT */}
            <div className="space-y-2 xl:h-full xl:min-h-0 xl:space-y-1.5 xl:overflow-y-auto xl:pr-1">
              {/* CUSTOMER DETAILS */}
              <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm xl:p-2">
                <h3 className="text-xs font-black text-gray-900">Customer Details</h3>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-gray-700">Name</label>
                    <div className={inputClass}>
                      <User className="h-3 w-3 shrink-0 text-gray-400" />
                      <input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer name" className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-gray-700">Phone</label>
                    <div className={inputClass}>
                      <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                      <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Mobile number" type="tel" className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400" />
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="mb-1 block text-[10px] font-bold text-gray-700">Address <span className="font-normal text-gray-400">(optional)</span></label>
                  <div className={inputClass}>
                    <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
                    <input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Delivery address" className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400" />
                  </div>
                </div>
              </div>

              {/* BILLING DETAILS */}
              <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm xl:p-2">
                <h3 className="mb-2 text-xs font-black text-gray-900 xl:mb-1">Billing Details</h3>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {billingRow(<span className="flex items-center gap-1.5"><Wallet className="h-3 w-3" /> Subtotal</span>, `₹${subtotal.toFixed(2)}`)}
                  {billingRow(
                    <span className="flex items-center gap-1.5"><Percent className="h-3 w-3" /> Discount</span>,
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-6 w-16 items-center rounded-md border border-gray-200 bg-white px-1.5">
                        <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))}
                          className="w-full text-[10px] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <span className="text-[10px] text-gray-500">%</span>
                      </div>
                      <span className="text-[11px] font-bold text-red-500">-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {billingRow(
                    <span className="flex items-center gap-1.5"><ShoppingBag className="h-3 w-3" /> Packing</span>,
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-6 w-16 items-center rounded-md border border-gray-200 bg-white px-1.5">
                        <input type="number" value={packingCharge} onChange={(e) => setPackingCharge(Number(e.target.value))}
                          className="w-full text-[10px] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      </div>
                      <span className="text-[11px] font-bold text-gray-700">+₹{packing.toFixed(2)}</span>
                    </div>
                  )}
                  {serviceChargePercentage > 0 && billingRow(
                    <span className="flex items-center gap-1.5"><Wallet className="h-3 w-3" /> Service ({serviceChargePercentage}%)</span>,
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold ${applyServiceCharge ? "text-gray-700" : "text-gray-400 line-through"}`}>
                        +₹{((subtotal - discountAmount + packing) * serviceChargePercentage / 100).toFixed(2)}
                      </span>
                      <button
                        onClick={() => setApplyServiceCharge(!applyServiceCharge)}
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black transition ${
                          applyServiceCharge
                            ? "bg-red-100 text-red-600 hover:bg-red-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {applyServiceCharge ? "Opt Out" : "Opted Out"}
                      </button>
                    </div>
                  )}
                  {gstPercentage > 0 && billingRow(
                    `CGST (${gstPercentage / 2}%)${isGSTInclusive ? " incl." : ""}`,
                    `${isGSTInclusive ? "" : "+"}₹${cgst.toFixed(2)}`
                  )}
                  {gstPercentage > 0 && billingRow(
                    `SGST (${gstPercentage / 2}%)${isGSTInclusive ? " incl." : ""}`,
                    `${isGSTInclusive ? "" : "+"}₹${sgst.toFixed(2)}`
                  )}
                  {billingRow(
                    <span className="flex items-center gap-1.5"><Info className="h-3 w-3" /> Round Off</span>,
                    <button
                      onClick={() => setRoundOff(!roundOff)}
                      className={`rounded-full px-2.5 py-0.5 text-[9px] font-black transition ${
                        roundOff
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {roundOff ? "✓ Applied" : "Off"}
                    </button>
                  )}
                  {billingRow(<span className="text-sm font-black text-red-700">Grand Total</span>, <span className="text-base font-black text-red-600">₹{grandTotal.toFixed(2)}</span>, true)}
                </div>

              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-2 xl:h-full xl:min-h-0 xl:space-y-1.5 xl:overflow-y-auto xl:pr-1">
              {/* TOTAL PAYABLE */}
              <div className="rounded-xl bg-gradient-to-br from-red-500 to-rose-600 p-4 text-white shadow-lg shadow-red-200 xl:p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-red-100">Total Payable</p>
                <h1 className="mt-1 text-4xl font-black xl:text-3xl">₹{finalPayable.toFixed(0)}</h1>
                {tipAmount > 0 && (
                  <p className="mt-1 text-[11px] text-red-100">₹{grandTotal.toFixed(0)} bill + ₹{tipAmount.toFixed(0)} tip</p>
                )}
                {splitCount > 1 && (
                  <p className="mt-1 text-[11px] text-red-100">Split {splitCount} ways · ₹{perPersonAmount.toFixed(0)} per person</p>
                )}
                {balance > 0 && cashReceived && (
                  <p className="mt-1 text-xs text-red-100">Balance: ₹{balance.toFixed(2)}</p>
                )}
              </div>

              {/* SPLIT BILL */}
              <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm xl:p-2">
                <h3 className="mb-2 text-xs font-black text-gray-900 xl:mb-1">Split Bill</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSplitCount((n) => Math.max(1, n - 1))}
                    disabled={splitCount <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-sm font-black text-gray-900">
                      {splitCount === 1 ? "No split" : `${splitCount} ways`}
                    </p>
                    {splitCount > 1 && (
                      <p className="text-[10px] text-gray-500">₹{perPersonAmount.toFixed(2)} each</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSplitCount((n) => Math.min(20, n + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600"
                  >
                    +
                  </button>
                </div>
                {splitCount > 1 && (
                  <p className="mt-2 text-[10px] text-gray-400">
                    One invoice is generated as usual — this only prints {splitCount} copies showing each person's share.
                  </p>
                )}
              </div>

              {/* TIP */}
              {tipsEnabled && (
                <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm xl:p-2">
                  <h3 className="mb-2 text-xs font-black text-gray-900 xl:mb-1">Add Tip</h3>
                  <div className="flex items-center gap-1.5">
                    {[0, 5, 10, 15].map((pct) => {
                      const amount = pct === 0 ? 0 : Math.round((grandTotal * pct) / 100);
                      const active = pct === 0 ? tipAmount === 0 : tipAmount === amount;
                      return (
                        <button
                          key={pct}
                          onClick={() => setTipAmount(amount)}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition ${
                            active ? "border-red-400 bg-red-50 text-red-600" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {pct === 0 ? "None" : `${pct}%`}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex h-8 items-center rounded-lg border border-gray-200 bg-gray-50 px-2.5 focus-within:border-red-400 focus-within:bg-white transition">
                    <span className="mr-1 text-xs font-bold text-gray-700">₹</span>
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
              <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm xl:p-2">
                <h3 className="mb-2 text-xs font-black text-gray-900 xl:mb-1">Payment Method</h3>
                <div className="space-y-1.5">
                  {paymentMethods.map((method: string) => {
                    const value = method.toLowerCase();
                    const active = paymentMethod === value;
                    const icon = paymentIcons[value] || "💰";
                    return (
                      <label key={method} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition ${active ? "border-red-400 bg-red-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                        <input type="radio" checked={active} onChange={() => setPaymentMethod(value)} className="hidden" />
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg ${active ? "bg-red-100" : "bg-gray-100"}`}>{icon}</div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-900">{method}</p>
                          <p className="text-[10px] text-gray-500">Pay using {value}</p>
                        </div>
                        {active && <CheckCircle className="h-4 w-4 shrink-0 text-red-500" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* CASH RECEIVED & BALANCE */}
              <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm xl:p-2">
                <h3 className="mb-2 text-xs font-black text-gray-900 xl:mb-1">Cash Payment</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-gray-700">
                      Cash Received <span className="font-normal text-gray-400">(opt)</span>
                    </label>
                    <div className="flex h-8 items-center rounded-lg border-2 border-red-300 bg-white px-2.5 focus-within:border-red-500 transition">
                      <span className="mr-1 text-xs font-bold text-gray-700">₹</span>
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
                    <label className="mb-1 block text-[10px] font-bold text-gray-700">Balance Due</label>
                    <div className="flex h-8 items-center rounded-lg bg-emerald-50 px-2.5">
                      <span className="text-sm font-black text-emerald-700">
                        ₹{balance > 0 ? balance.toFixed(2) : "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ORDER TYPE — picked right before the bill is generated */}
              {orderTypeOptions && orderTypeOptions.length > 1 && (
                <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm xl:p-2">
                  <h3 className="mb-2 text-xs font-black text-gray-900 xl:mb-1">Order Type</h3>
                  <div className="flex gap-2">
                    {orderTypeOptions.map((opt) => {
                      const active = selectedOrderType === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => setSelectedOrderType?.(opt.key)}
                          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                            active
                              ? "border-red-400 bg-red-50 text-red-600"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
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
          </div>
        </div>
      </div>

      {/* CONFIRM — laptop/monitor: pinned footer so it's always visible, no page scroll needed */}
      <div className="hidden shrink-0 gap-2 border-t border-gray-100 bg-white p-2.5 xl:flex">
        <button
          onClick={() => onConfirm({ paymentMethod, grandTotal, tipAmount, splitCount, cgst, sgst, gstAmount, serviceChargeAmount, discountAmount, packingCharge, shouldPrint: false })}
          disabled={loading}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 transition hover:bg-gray-50 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <CheckCircle className="h-4 w-4" />
          {loading ? "..." : "Confirm"}
        </button>
        <button
          onClick={() => onConfirm({ paymentMethod, grandTotal, tipAmount, splitCount, cgst, sgst, gstAmount, serviceChargeAmount, discountAmount, packingCharge, shouldPrint: true })}
          disabled={loading}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-xs font-black text-white shadow-xl shadow-red-200 transition hover:shadow-2xl active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Printer className="h-4 w-4" />
          {loading ? "Placing..." : "Confirm + Print"}
        </button>
      </div>

      {/* MOBILE CONFIRM */}
      <div className="xl:hidden shrink-0 border-t border-gray-100 bg-white p-2.5 flex gap-2">
        <button
          onClick={() => onConfirm({ paymentMethod, grandTotal, tipAmount, splitCount, cgst, sgst, gstAmount, serviceChargeAmount, discountAmount, packingCharge, shouldPrint: false })}
          disabled={loading}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <CheckCircle className="h-4 w-4" />
          {loading ? "..." : "Confirm"}
        </button>
        <button
          onClick={() => onConfirm({ paymentMethod, grandTotal, tipAmount, splitCount, cgst, sgst, gstAmount, serviceChargeAmount, discountAmount, packingCharge, shouldPrint: true })}
          disabled={loading}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-xs font-black text-white shadow-lg shadow-red-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Printer className="h-4 w-4" />
          {loading ? "Placing..." : `Print · ₹${finalPayable.toFixed(0)}`}
        </button>
      </div>
    </div>
  );
}
