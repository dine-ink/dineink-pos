import { User, Phone } from "lucide-react";

type Props = {
  customerName: string;
  setCustomerName: any;

  customerPhone: string;
  setCustomerPhone: any;

  grandTotal: number;

  billingType: string;

  setStep: any;

  onConfirm: any;
};

export default function CustomerSection({
  customerName,
  setCustomerName,

  customerPhone,
  setCustomerPhone,

  grandTotal,

  billingType,

  setStep,

  onConfirm,
}: Props) {
  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* HEADER */}
      <div className="border-b border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900">
              Customer Details
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Enter customer information
            </p>
          </div>

          <button
            onClick={() => setStep("CART")}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
          >
            Back
          </button>
        </div>
      </div>

      {/* FORM */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* NAME */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Customer Name
            </label>

            <div className="relative">
              <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter name"
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none"
              />
            </div>
          </div>

          {/* PHONE */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Mobile Number
            </label>

            <div className="relative">
              <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter mobile number"
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="mb-4 rounded-2xl bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total Payable</p>

              <h2 className="mt-1 text-3xl font-black text-red-600">
                ₹{grandTotal.toFixed(2)}
              </h2>
            </div>

            <div className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-red-600">
              {billingType.replace("_", " ")}
            </div>
          </div>
        </div>

        <button
          onClick={onConfirm}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-red-500 text-sm font-black text-white shadow-lg"
        >
          Confirm Order
        </button>
      </div>
    </div>
  );
}
