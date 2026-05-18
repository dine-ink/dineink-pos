import { ShoppingBag } from "lucide-react";

type Props = {
  totalItems: number;
  setStep: any;
};

export default function BillingHeader({ totalItems, setStep }: Props) {
  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Billing POS</h1>

          <p className="text-xs text-gray-500">Fast restaurant billing</p>
        </div>

        <button
          onClick={() => setStep("CART")}
          className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg"
        >
          <ShoppingBag className="h-5 w-5" />

          {totalItems > 0 && (
            <div className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-red-600">
              {totalItems}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
