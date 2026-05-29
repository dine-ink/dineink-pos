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
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* HEADER */}
      <div className="shrink-0 border-b border-gray-100 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep("MENU")}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <div>
              <h2 className="text-sm font-black text-gray-900">Your Cart</h2>
              <p className="text-[10px] text-gray-500">{totalItems} items selected</p>
            </div>
          </div>
          {cartItems.length > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-black text-red-700">
              ₹{grandTotal.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 min-h-0 flex-col xl:flex-row overflow-hidden">
        {/* ITEMS LIST */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
          {cartItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                <ShoppingBag className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900">Cart is empty</h3>
                <p className="mt-0.5 text-xs text-gray-500">Add items from the menu</p>
              </div>
              <button
                onClick={() => setStep("MENU")}
                className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {cartItems.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 p-2.5"
                >
                  {/* ICON */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
                    <ShoppingBag className="h-3.5 w-3.5 text-red-400" />
                  </div>

                  {/* INFO */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-bold text-gray-900">{item.name}</p>
                    <p className="text-[10px] text-gray-500">₹{item.price} each</p>
                  </div>

                  {/* QTY STEPPER */}
                  <div className="flex items-center gap-1 rounded-lg bg-red-500 px-1 py-1 text-white">
                    <button
                      onClick={() => decreaseQty(item.id)}
                      className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20 transition active:scale-90"
                    >
                      <Minus className="h-2.5 w-2.5" strokeWidth={3} />
                    </button>
                    <span className="min-w-[18px] text-center text-xs font-black">
                      {activeCart[item.id]}
                    </span>
                    <button
                      onClick={() => increaseQty(item.id)}
                      className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20 transition active:scale-90"
                    >
                      <Plus className="h-2.5 w-2.5" strokeWidth={3} />
                    </button>
                  </div>

                  {/* TOTAL */}
                  <div className="shrink-0 text-right min-w-[48px]">
                    <p className="text-sm font-black text-red-600">
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
          <div className="hidden xl:flex xl:w-[240px] xl:shrink-0 xl:flex-col border-l border-gray-100">
            <div className="flex-1 p-3">
              <h3 className="text-sm font-black text-gray-900">Order Summary</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Review before checkout</p>
              <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Items</span>
                  <span className="text-sm font-black text-gray-900">{totalItems}</span>
                </div>
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <p className="text-[10px] text-gray-500">Grand Total</p>
                  <h2 className="mt-0.5 text-3xl font-black text-red-600">₹{grandTotal.toFixed(2)}</h2>
                </div>
              </div>
            </div>
            <div className="shrink-0 p-3 pt-0">
              <button
                onClick={() => setStep("CUSTOMER")}
                className="flex h-9 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-xs font-black text-white shadow-lg shadow-red-100 transition hover:shadow-xl active:scale-[0.99]"
              >
                Continue to Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE FOOTER */}
      {cartItems.length > 0 && (
        <div className="xl:hidden shrink-0 border-t border-gray-100 bg-white px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-500">Grand Total</p>
              <h2 className="text-xl font-black text-red-600">₹{grandTotal.toFixed(2)}</h2>
            </div>
            <button
              onClick={() => setStep("CUSTOMER")}
              className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 py-2.5 text-xs font-black text-white shadow-lg shadow-red-100"
            >
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
