import { Plus, Minus } from "lucide-react";

type Props = {
  product: any;
  qty: number;
  increaseQty: any;
  decreaseQty: any;
};

export default function ProductCard({
  product,
  qty,
  increaseQty,
  decreaseQty,
}: Props) {
  const unavailable = product.isAvailable === false;

  return (
    <div className={`relative flex flex-col justify-between rounded-xl border p-2.5 shadow-sm transition-shadow ${unavailable ? "border-gray-100 bg-gray-50 opacity-60" : "border-gray-100 bg-white hover:shadow-md"}`}>
      {/* SOLD OUT BADGE */}
      {unavailable && (
        <span className="absolute right-2 top-2 rounded-md bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500">
          Sold Out
        </span>
      )}

      {/* NAME & PRICE */}
      <div>
        <h3 className={`line-clamp-2 text-xs font-semibold leading-tight ${unavailable ? "text-gray-400" : "text-gray-900"}`}>
          {product.name}
        </h3>
        <p className={`mt-1 text-sm font-black ${unavailable ? "text-gray-400" : "text-red-600"}`}>
          ₹{product.price}
        </p>
      </div>

      {/* ADD / STEPPER */}
      <div className="mt-2">
        {unavailable ? (
          <div className="flex h-7 w-full items-center justify-center rounded-lg bg-gray-200">
            <span className="text-[11px] font-semibold text-gray-400">Unavailable</span>
          </div>
        ) : qty === 0 ? (
          <button
            onClick={() => increaseQty(product.id)}
            className="flex h-7 w-full items-center justify-center gap-1 rounded-lg bg-red-500 text-white transition active:scale-95"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} />
            <span className="text-[11px] font-bold">Add</span>
          </button>
        ) : (
          <div className="flex h-7 items-center justify-between rounded-lg bg-red-500 px-1 text-white">
            <button
              onClick={() => decreaseQty(product.id)}
              className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20 transition active:scale-90"
            >
              <Minus className="h-3 w-3" strokeWidth={2.5} />
            </button>
            <span className="min-w-[20px] text-center text-xs font-black">
              {qty}
            </span>
            <button
              onClick={() => increaseQty(product.id)}
              className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20 transition active:scale-90"
            >
              <Plus className="h-3 w-3" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
