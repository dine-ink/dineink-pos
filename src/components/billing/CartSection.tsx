import { Minus, Plus, ShoppingBag } from "lucide-react";

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
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      {/* ================= HEADER ================= */}

      <div className="border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 px-4 py-3 xl:px-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900 xl:text-xl">
              Cart
            </h2>

            <p className="mt-1 text-xs text-gray-500">Review selected items</p>
          </div>

          <button
            onClick={() => setStep("MENU")}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>

      {/* ================= BODY ================= */}

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        {/* ================= LEFT ITEMS ================= */}

        <div className="min-h-0 flex-1 overflow-y-auto p-3 xl:p-5">
          {cartItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                <ShoppingBag className="h-10 w-10 text-red-500" />
              </div>

              <h2 className="mt-5 text-lg font-black text-gray-900">
                Cart Empty
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Add menu items to continue
              </p>
            </div>
          ) : (
            <div className="mx-auto  space-y-3">
              {cartItems.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:border-red-100 hover:shadow-md"
                >
                  {/* ================= MOBILE ================= */}

                  <div className="p-3 xl:hidden">
                    {/* TOP */}

                    <div className="flex items-start justify-between gap-3">
                      {/* LEFT */}

                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                          <ShoppingBag className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate text-sm font-black text-gray-900">
                              {item.name}
                            </h3>

                            <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[8px] font-bold text-red-600">
                              Bestseller
                            </span>
                          </div>

                          <p className="mt-0.5 text-[11px] text-gray-500">
                            ₹{item.price} each
                          </p>
                        </div>
                      </div>

                      {/* TOTAL */}

                      <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                          Total
                        </p>

                        <h2 className="text-lg font-black text-red-600">
                          ₹{item.price * activeCart[item.id]}
                        </h2>
                      </div>
                    </div>

                    {/* BOTTOM */}

                    <div className="mt-3 flex items-center justify-between">
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                        Active Order
                      </span>

                      {/* QTY */}

                      <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 px-2 py-1 text-white shadow-lg shadow-red-100">
                        <button
                          onClick={() => decreaseQty(item.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20"
                        >
                          <Minus className="h-3 w-3" />
                        </button>

                        <span className="w-5 text-center text-sm font-black">
                          {activeCart[item.id]}
                        </span>

                        <button
                          onClick={() => increaseQty(item.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ================= DESKTOP ================= */}

                  <div className="hidden items-center justify-between gap-4 px-4 py-3 xl:flex">
                    {/* LEFT */}

                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                        <ShoppingBag className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-black text-gray-900">
                            {item.name}
                          </h3>

                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-600">
                            Bestseller
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm text-gray-500">
                            ₹{item.price} each
                          </p>

                          <span className="h-1 w-1 rounded-full bg-gray-300" />

                          <span className="text-[11px] font-semibold text-emerald-600">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT */}

                    <div className="flex items-center gap-4">
                      {/* QTY */}

                      <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 px-2 py-1 text-white shadow-lg shadow-red-100">
                        <button
                          onClick={() => decreaseQty(item.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20"
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <span className="w-5 text-center text-sm font-black">
                          {activeCart[item.id]}
                        </span>

                        <button
                          onClick={() => increaseQty(item.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* TOTAL */}

                      <div className="min-w-[90px] text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                          Total
                        </p>

                        <h2 className="text-xl font-black text-red-600">
                          ₹{item.price * activeCart[item.id]}
                        </h2>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================= DESKTOP SUMMARY ================= */}

        {cartItems.length > 0 && (
          <div className="hidden w-[340px] border-l border-gray-100 bg-gray-50 xl:flex xl:flex-col">
            {/* TOP */}

            <div className="p-5">
              <h2 className="text-xl font-black text-gray-900">
                Order Summary
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Review before checkout
              </p>
            </div>

            {/* SUMMARY */}

            <div className="flex-1 p-5 pt-0">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Items</span>

                  <span className="text-lg font-black text-gray-900">
                    {totalItems}
                  </span>
                </div>

                <div className="mt-5 border-t border-gray-100 pt-5">
                  <p className="text-sm text-gray-500">Grand Total</p>

                  <h2 className="mt-2 text-4xl font-black text-red-600">
                    ₹{grandTotal.toFixed(2)}
                  </h2>
                </div>
              </div>
            </div>

            {/* ACTION */}

            <div className="p-5 pt-0">
              <button
                onClick={() => setStep("CUSTOMER")}
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 text-sm font-black text-white shadow-lg shadow-red-100 transition-all hover:scale-[1.01]"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MOBILE FOOTER ================= */}

      {cartItems.length > 0 && (
        <div className="border-t border-gray-100 bg-gradient-to-r from-white to-gray-50 p-4 xl:hidden">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Grand Total</p>

              <h2 className="text-3xl font-black text-red-600">
                ₹{grandTotal.toFixed(2)}
              </h2>
            </div>

            <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
              {totalItems} Items
            </div>
          </div>

          <button
            onClick={() => setStep("CUSTOMER")}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 text-sm font-black text-white shadow-lg shadow-red-100"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
