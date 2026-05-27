import { useEffect, useState } from "react";
import {
  User,
  Phone,
  MapPin,
  Wallet,
  Percent,
  ShoppingBag,
  Info,
  Pencil,
  ChevronDown,
  ChevronUp,
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
  console.log(grand_Total, "grandTotal");

  const [subtotal, setSubtotal] = useState<any>(grand_Total);
  const [discount, setDiscount] = useState<number>(0);

  const [packingCharge, setPackingCharge] = useState<number>(0);
  const [roundOff, setRoundOff] = useState(true);
  const [cashReceived, setCashReceived] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(
    billing.paymentMethods?.[0]?.toLowerCase() || "",
  );
  const paymentMethods = billing?.paymentMethods || [];
  // MOBILE TOGGLE
  const [openBilling, setOpenBilling] = useState(true);
  const [openPayment, setOpenPayment] = useState(true);

  const discountAmount = (subtotal * discount) / 100;

  const packing = Number(packingCharge) || 0;

  const gstPercentage = billing?.gstPercentage || 0;

  const serviceChargePercentage = billing?.serviceCharge || 0;

  // ================= SERVICE CHARGE =================

  const serviceChargeAmount =
    ((subtotal - discountAmount + packing) * serviceChargePercentage) / 100;

  // ================= GST =================

  const taxableAmount =
    subtotal - discountAmount + packing + serviceChargeAmount;

  const gstAmount = billing?.includeGST
    ? (taxableAmount * gstPercentage) / 100
    : 0;

  // ================= CGST / SGST =================

  const cgst = gstAmount / 2;

  const sgst = gstAmount / 2;

  // ================= FINAL =================

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
  return (
    <div className="h-screen overflow-y-auto bg-[#f7f7f7] p-2">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-2">
        {/* LEFT SIDE */}
        <div className="space-y-2">
          {/* CUSTOMER DETAILS */}
          <div className="bg-white rounded-xl p-3">
            {/* HEADER */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Customer Details
                </h1>

                <p className="text-xs text-gray-500 mt-1">
                  Enter customer information
                </p>
              </div>

              <button
                className="border border-gray-300 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-gray-100 transition"
                onClick={() => setStep("CART")}
              >
                Back
              </button>
            </div>

            {/* FORM */}
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* CUSTOMER NAME */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Customer Name
                  </label>

                  <div className="h-9 border border-gray-300 rounded-xl flex items-center px-3 bg-white">
                    <User className="w-4 h-4 text-gray-400" />

                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      type="text"
                      placeholder="Enter name"
                      className="w-full h-7 px-2 outline-none bg-transparent text-sm"
                    />
                  </div>
                </div>

                {/* MOBILE NUMBER */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Mobile Number
                  </label>

                  <div className="h-9 border border-gray-300 rounded-xl flex items-center px-3 bg-white">
                    <Phone className="w-4 h-4 text-gray-400" />

                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      type="text"
                      placeholder="Enter mobile number"
                      className="w-full h-7 px-2 outline-none bg-transparent text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* ADDRESS */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Address (Optional)
                </label>

                <div className="h-9 border border-gray-300 rounded-xl flex items-center px-3 bg-white">
                  <MapPin className="w-4 h-4 text-gray-400" />

                  <input
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    type="text"
                    placeholder="Enter address"
                    className="w-full h-7 px-2 outline-none bg-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* BILLING DETAILS */}
          <div className="bg-white rounded-xl p-3">
            {/* HEADER */}
            <div
              className="flex items-center justify-between cursor-pointer lg:cursor-default"
              onClick={() =>
                window.innerWidth < 1024 && setOpenBilling(!openBilling)
              }
            >
              <h2 className="text-xl font-bold text-slate-900">
                Billing Details
              </h2>

              {/* MOBILE ONLY */}
              <div className="lg:hidden">
                {openBilling ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </div>

            {openBilling && (
              <>
                {/* BILLING TABLE */}
                <div className="mt-3 border border-gray-300 rounded-xl overflow-hidden">
                  {/* SUBTOTAL */}
                  <div className="flex items-center justify-between px-3 py-3 border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-gray-500" />
                      <span className="text-xs">Subtotal</span>
                    </div>

                    <span className="font-semibold text-xs">
                      ₹{subtotal.toFixed(2)}
                    </span>
                  </div>

                  {/* DISCOUNT */}
                  <div className="flex items-center justify-between px-3 py-3 border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-gray-500" />
                      <span className="text-xs">Discount</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="border border-gray-300 rounded-lg h-7 w-20 flex items-center px-2">
                        <input
                          type="number"
                          value={discount}
                          placeholder="0"
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          className="w-full outline-none text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />

                        <span className="text-xs">%</span>
                      </div>

                      <span className="font-semibold text-red-500 text-xs">
                        - ₹{discountAmount.toFixed(2)}
                      </span>

                      {/* <Pencil className="w-3 h-3 text-red-500" /> */}
                    </div>
                  </div>

                  {/* PACKING CHARGE */}
                  <div className="flex items-center justify-between px-3 py-3 border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-gray-500" />

                      <span className="text-xs">Packing Charge</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="border border-gray-300 rounded-lg h-7 w-20 flex items-center px-2">
                        <input
                          type="number"
                          value={packingCharge}
                          placeholder="0"
                          onChange={(e) =>
                            setPackingCharge(Number(e.target.value))
                          }
                          className="w-full outline-none text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>

                      <span className="font-semibold text-xs">
                        + ₹{Number(packingCharge).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {/* SERVICE CHARGE */}

                  <div className="flex items-center justify-between px-3 py-3 border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-gray-500" />

                      <span className="text-xs">
                        Service Charge ({serviceChargePercentage}%)
                      </span>
                    </div>

                    <span className="font-semibold text-xs">
                      + ₹{serviceChargeAmount.toFixed(2)}
                    </span>
                  </div>
                  {/* ROUND OFF */}
                  <div className="flex items-center justify-between px-3 py-3 border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-gray-500" />

                      <span className="text-xs">Round Off (Paise)</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={roundOff}
                          onChange={() => setRoundOff(!roundOff)}
                          className="w-4 h-4"
                        />
                        Apply Round Off
                      </label>

                      <span className="font-semibold text-xs">
                        ₹{totalBeforeRoundOff.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {/* CGST */}

                  <div className="flex items-center justify-between px-3 py-3 border-b border-gray-300">
                    <span className="text-xs">CGST ({gstPercentage / 2}%)</span>

                    <span className="font-semibold text-xs">
                      ₹{cgst.toFixed(2)}
                    </span>
                  </div>

                  {/* SGST */}

                  <div className="flex items-center justify-between px-3 py-3 border-b border-gray-300">
                    <span className="text-xs">SGST ({gstPercentage / 2}%)</span>

                    <span className="font-semibold text-xs">
                      ₹{sgst.toFixed(2)}
                    </span>
                  </div>
                  {/* GRAND TOTAL */}
                  <div className="flex items-center justify-between px-3 py-2 bg-red-50">
                    <span className="text-lg font-bold text-red-600">
                      Grand Total
                    </span>

                    <span className="text-lg font-bold text-red-600">
                      ₹{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* PARTIAL CASH */}
                <div className="mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px_320px] gap-3 items-end">
                    {/* LEFT CONTENT */}
                    <div>
                      <h3 className="text-lg font-bold">
                        Partial Cash Payment (Optional)
                      </h3>

                      <p className="text-gray-500 mt-1 text-xs">
                        Enter cash amount received (balance can be paid via
                        other methods)
                      </p>
                    </div>

                    {/* CASH INPUT */}
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Cash Received
                      </label>

                      <div className="h-11 border-2 border-red-400 rounded-xl flex items-center px-3 bg-white">
                        <span className="text-sm font-bold">₹</span>

                        <input
                          type="number"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder="Enter cash amount"
                          className="w-full h-full px-2 outline-none bg-transparent text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>

                    {/* BALANCE */}
                    <div className="h-11 bg-green-50 rounded-xl px-4 flex flex-col justify-center">
                      <span className="text-[11px] text-gray-600 leading-none">
                        Balance to Pay
                      </span>

                      <span className="text-lg font-bold text-green-600 leading-none mt-1">
                        ₹{balance > 0 ? balance.toFixed(2) : "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="bg-white rounded-xl p-3 h-fit">
          {/* TOTAL */}
          <div className="bg-red-50 rounded-xl p-5 text-center">
            <p className="text-gray-600 text-sm">Total Payable</p>

            <h1 className="text-4xl font-bold text-red-600 mt-2">
              ₹{balance.toFixed(2)}
            </h1>
          </div>

          {/* PAYMENT METHOD */}
          <div className="mt-4">
            {/* HEADER */}
            <div
              className="flex items-center justify-between cursor-pointer lg:cursor-default"
              onClick={() =>
                window.innerWidth < 1024 && setOpenPayment(!openPayment)
              }
            >
              <h2 className="text-xl font-bold">Payment Method</h2>

              {/* MOBILE ONLY */}
              <div className="lg:hidden">
                {openPayment ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </div>

            {openPayment && (
              <>
                <p className="text-gray-500 mt-1 text-xs">
                  Select a payment method
                </p>

                <div className="mt-3 border border-gray-300 rounded-xl overflow-hidden">
                  {paymentMethods.map((method: string, index: number) => {
                    const value = method.toLowerCase();

                    return (
                      <label
                        key={method}
                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${
                          index !== paymentMethods.length - 1
                            ? "border-b border-gray-300"
                            : ""
                        }`}
                      >
                        <input
                          type="radio"
                          checked={paymentMethod === value}
                          onChange={() => setPaymentMethod(value)}
                          className="w-4 h-4 accent-red-500"
                        />

                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white">
                          {value === "cash" && (
                            <span className="text-xl">💵</span>
                          )}

                          {value === "card" && (
                            <span className="text-xl">💳</span>
                          )}

                          {value === "upi" && (
                            <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                              UPI
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="font-semibold text-sm">{method}</h3>

                          <p className="text-xs text-gray-500">
                            Pay using {method}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER BUTTON */}
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
        className="w-full mt-2 h-12 rounded-xl bg-linear-to-r from-red-600 to-pink-600 text-white text-base font-bold shadow-lg hover:opacity-95 transition"
      >
        Confirm Order
      </button>
    </div>
  );
}
