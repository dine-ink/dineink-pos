import { useEffect, useState } from "react";
import {
  User,
  Phone,
  MapPin,
  Wallet,
  Percent,
  ShoppingBag,
  Info,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

type Props = {
  customerName: string;
  setCustomerName: any;
  customerPhone: string;
  setCustomerPhone: any;
  customerAddress: string;
  setCustomerAddress: any;
  grand_Total: number;
  billingType: string;
  setStep: any;
  billing: any;
  onConfirm: any;
};

export default function CustomerSection({
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  grand_Total,
  billing,
  billingType,
  setStep,
  onConfirm,
}: Props) {
  const [subtotal] = useState<number>(grand_Total);
  const [discount, setDiscount] = useState<number>(0);
  const [packingCharge, setPackingCharge] = useState<number>(0);
  const [roundOff, setRoundOff] = useState(true);
  const [cashReceived, setCashReceived] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(
    billing.paymentMethods?.[0]?.toLowerCase() || "",
  );
  const paymentMethods = billing?.paymentMethods || [];

  const discountAmount = (subtotal * discount) / 100;
  const packing = Number(packingCharge) || 0;
  const gstPercentage = billing?.gstPercentage || 0;
  const serviceChargePercentage = billing?.serviceCharge || 0;
  const serviceChargeAmount =
    ((subtotal - discountAmount + packing) * serviceChargePercentage) / 100;
  const taxableAmount =
    subtotal - discountAmount + packing + serviceChargeAmount;
  const gstAmount = billing?.includeGST
    ? (taxableAmount * gstPercentage) / 100
    : 0;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const totalBeforeRoundOff = taxableAmount + gstAmount;
  const grandTotal = roundOff
    ? Math.round(totalBeforeRoundOff)
    : totalBeforeRoundOff;
  const balance = grandTotal - (Number(cashReceived) || 0);

  useEffect(() => {
    if (paymentMethods.length > 0) {
      setPaymentMethod(paymentMethods[0].toLowerCase());
    }
  }, [paymentMethods]);

  const paymentIcons: Record<string, string> = {
    cash: "💵",
    card: "💳",
    upi: "📱",
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* HEADER */}
      <div className="shrink-0 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <button
          onClick={() => setStep("CART")}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-lg font-black text-gray-900">Checkout</h2>
          <p className="text-xs text-gray-500">Customer & payment details</p>
        </div>
      </div>

      {/* BODY - scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-3 xl:p-4">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_320px]">
            {/* LEFT COLUMN */}
            <div className="space-y-3">
              {/* CUSTOMER DETAILS */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="text-base font-black text-gray-900">
                  Customer Details
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Optional — enter for records
                </p>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* NAME */}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">
                      Name
                    </label>
                    <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 focus-within:border-red-400 focus-within:bg-white transition">
                      <User className="h-4 w-4 shrink-0 text-gray-400" />
                      <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer name"
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* PHONE */}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">
                      Phone
                    </label>
                    <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 focus-within:border-red-400 focus-within:bg-white transition">
                      <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                      <input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Mobile number"
                        type="tel"
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* ADDRESS */}
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-bold text-gray-700">
                    Address{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 focus-within:border-red-400 focus-within:bg-white transition">
                    <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                    <input
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Delivery address"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* BILLING DETAILS */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="text-base font-black text-gray-900">
                  Billing Details
                </h3>
                <div className="mt-3 space-y-0 divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                  {/* SUBTOTAL */}
                  <div className="flex items-center justify-between px-3 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Wallet className="h-4 w-4" />
                      Subtotal
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      ₹{subtotal.toFixed(2)}
                    </span>
                  </div>

                  {/* DISCOUNT */}
                  <div className="flex items-center justify-between px-3 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Percent className="h-4 w-4" />
                      Discount
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-20 items-center rounded-lg border border-gray-200 bg-white px-2">
                        <input
                          type="number"
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          className="w-full text-xs outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                      <span className="text-sm font-bold text-red-500">
                        -₹{discountAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* PACKING */}
                  <div className="flex items-center justify-between px-3 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <ShoppingBag className="h-4 w-4" />
                      Packing
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-20 items-center rounded-lg border border-gray-200 bg-white px-2">
                        <input
                          type="number"
                          value={packingCharge}
                          onChange={(e) =>
                            setPackingCharge(Number(e.target.value))
                          }
                          className="w-full text-xs outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700">
                        +₹{packing.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* SERVICE CHARGE */}
                  <div className="flex items-center justify-between px-3 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Wallet className="h-4 w-4" />
                      Service ({serviceChargePercentage}%)
                    </div>
                    <span className="text-sm font-bold text-gray-700">
                      +₹{serviceChargeAmount.toFixed(2)}
                    </span>
                  </div>

                  {/* CGST */}
                  <div className="flex items-center justify-between px-3 py-3">
                    <span className="text-sm text-gray-600">
                      CGST ({gstPercentage / 2}%)
                    </span>
                    <span className="text-sm font-bold text-gray-700">
                      ₹{cgst.toFixed(2)}
                    </span>
                  </div>

                  {/* SGST */}
                  <div className="flex items-center justify-between px-3 py-3">
                    <span className="text-sm text-gray-600">
                      SGST ({gstPercentage / 2}%)
                    </span>
                    <span className="text-sm font-bold text-gray-700">
                      ₹{sgst.toFixed(2)}
                    </span>
                  </div>

                  {/* ROUND OFF */}
                  <div className="flex items-center justify-between px-3 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Info className="h-4 w-4" />
                      Round Off
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roundOff}
                        onChange={() => setRoundOff(!roundOff)}
                        className="h-4 w-4 accent-red-500"
                      />
                      <span className="text-xs font-semibold text-gray-600">
                        Apply
                      </span>
                    </label>
                  </div>

                  {/* GRAND TOTAL */}
                  <div className="flex items-center justify-between bg-red-50 px-3 py-3">
                    <span className="text-base font-black text-red-700">
                      Grand Total
                    </span>
                    <span className="text-xl font-black text-red-600">
                      ₹{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* PARTIAL CASH */}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">
                      Cash Received{" "}
                      <span className="font-normal text-gray-400">
                        (optional)
                      </span>
                    </label>
                    <div className="flex h-11 items-center rounded-xl border-2 border-red-300 bg-white px-3 focus-within:border-red-500 transition">
                      <span className="mr-1 text-sm font-bold text-gray-700">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="Enter amount"
                        className="flex-1 bg-transparent text-sm outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">
                      Balance Due
                    </label>
                    <div className="flex h-11 items-center rounded-xl bg-emerald-50 px-3">
                      <span className="text-base font-black text-emerald-700">
                        ₹{balance > 0 ? balance.toFixed(2) : "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-3">
              {/* TOTAL PAYABLE */}
              <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-500 to-rose-600 p-5 text-white shadow-lg shadow-red-200">
                <p className="text-xs font-bold uppercase tracking-widest text-red-100">
                  Total Payable
                </p>
                <h1 className="mt-2 text-5xl font-black">
                  ₹{grandTotal.toFixed(0)}
                </h1>
                {balance > 0 && cashReceived && (
                  <p className="mt-2 text-sm text-red-100">
                    Balance: ₹{balance.toFixed(2)}
                  </p>
                )}
              </div>

              {/* PAYMENT METHOD */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="text-base font-black text-gray-900">
                  Payment Method
                </h3>
                <p className="mt-0.5 mb-3 text-xs text-gray-500">
                  Choose how customer pays
                </p>
                <div className="space-y-2">
                  {paymentMethods.map((method: string) => {
                    const value = method.toLowerCase();
                    const active = paymentMethod === value;
                    const icon = paymentIcons[value] || "💰";
                    return (
                      <label
                        key={method}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                          active
                            ? "border-red-400 bg-red-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={active}
                          onChange={() => setPaymentMethod(value)}
                          className="hidden"
                        />
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${
                            active ? "bg-red-100" : "bg-gray-100"
                          }`}
                        >
                          {icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">
                            {method}
                          </p>
                          <p className="text-xs text-gray-500">
                            Pay using {value}
                          </p>
                        </div>
                        {active && (
                          <CheckCircle className="h-5 w-5 shrink-0 text-red-500" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* CONFIRM BUTTON - desktop */}
              <button
                onClick={() =>
                  onConfirm({
                    paymentMethod,
                    grandTotal,
                    cgst,
                    sgst,
                    gstAmount,
                    serviceChargeAmount,
                    discountAmount,
                    packingCharge,
                  })
                }
                className="hidden xl:flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-sm font-black text-white shadow-xl shadow-red-200 transition hover:shadow-2xl active:scale-[0.99]"
              >
                <CheckCircle className="h-5 w-5" />
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE CONFIRM FOOTER */}
      <div className="xl:hidden shrink-0 border-t border-gray-100 bg-white p-3">
        <button
          onClick={() =>
            onConfirm({
              paymentMethod,
              grandTotal,
              cgst,
              sgst,
              gstAmount,
              serviceChargeAmount,
              discountAmount,
              packingCharge,
            })
          }
          className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 py-3.5 text-sm font-black text-white shadow-lg shadow-red-200"
        >
          <CheckCircle className="h-5 w-5" />
          Confirm Order · ₹{grandTotal.toFixed(0)}
        </button>
      </div>
    </div>
  );
}
