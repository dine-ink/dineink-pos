import { Minus, Plus, ShoppingBag, ArrowLeft } from "lucide-react";

type Props = {
  cartItems: any[];
  activeCart: any;
  grandTotal: number;
  totalItems: number;
  increaseQty: any;
  decreaseQty: any;
  setStep: any;
};

export default function CartSection({
  cartItems,
  activeCart,
  grandTotal,
  totalItems,
  increaseQty,
  decreaseQty,
  setStep,
}: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* HEADER */}
      <div className="shrink-0 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("MENU")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-lg font-black text-gray-900">Your Cart</h2>
              <p className="text-xs text-gray-500">{totalItems} items selected</p>
            </div>
          </div>
          {cartItems.length > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
              ₹{grandTotal.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 min-h-0 flex-col xl:flex-row overflow-hidden">
        {/* ITEMS LIST */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 xl:p-4">
          {cartItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <ShoppingBag className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">
                  Cart is empty
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add items from the menu
                </p>
              </div>
              <button
                onClick={() => setStep("MENU")}
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cartItems.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3"
                >
                  {/* ICON */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                    <ShoppingBag className="h-4 w-4 text-red-400" />
                  </div>

                  {/* INFO */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">₹{item.price} each</p>
                  </div>

                  {/* QTY STEPPER */}
                  <div className="flex items-center gap-1.5 rounded-xl bg-red-500 px-1.5 py-1 text-white">
                    <button
                      onClick={() => decreaseQty(item.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 transition active:scale-90"
                    >
                      <Minus className="h-3 w-3" strokeWidth={3} />
                    </button>
                    <span className="min-w-[20px] text-center text-sm font-black">
                      {activeCart[item.id]}
                    </span>
                    <button
                      onClick={() => increaseQty(item.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 transition active:scale-90"
                    >
                      <Plus className="h-3 w-3" strokeWidth={3} />
                    </button>
                  </div>

                  {/* TOTAL */}
                  <div className="shrink-0 text-right min-w-[56px]">
                    <p className="text-base font-black text-red-600">
                      ₹{item.price * activeCart[item.id]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DESKTOP SUMMARY SIDEBAR */}
        {cartItems.length > 0 && (
          <div className="hidden xl:flex xl:w-[300px] xl:shrink-0 xl:flex-col border-l border-gray-100">
            <div className="flex-1 p-5">
              <h3 className="text-lg font-black text-gray-900">
                Order Summary
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Review before checkout
              </p>
              <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Items</span>
                  <span className="text-base font-black text-gray-900">
                    {totalItems}
                  </span>
                </div>
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <p className="text-xs text-gray-500">Grand Total</p>
                  <h2 className="mt-1 text-4xl font-black text-red-600">
                    ₹{grandTotal.toFixed(2)}
                  </h2>
                </div>
              </div>
            </div>
            <div className="shrink-0 p-5 pt-0">
              <button
                onClick={() => setStep("CUSTOMER")}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-sm font-black text-white shadow-lg shadow-red-100 transition hover:shadow-xl active:scale-[0.99]"
              >
                Continue to Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE FOOTER */}
      {cartItems.length > 0 && (
        <div className="xl:hidden shrink-0 border-t border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500">Grand Total</p>
              <h2 className="text-2xl font-black text-red-600">
                ₹{grandTotal.toFixed(2)}
              </h2>
            </div>
            <button
              onClick={() => setStep("CUSTOMER")}
              className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 py-3 text-sm font-black text-white shadow-lg shadow-red-100"
            >
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
