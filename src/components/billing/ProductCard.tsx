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
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      {/* NAME & PRICE */}
      <div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-gray-900">
          {product.name}
        </h3>
        <p className="mt-1.5 text-base font-black text-red-600">
          ₹{product.price}
        </p>
      </div>

      {/* ADD / STEPPER */}
      <div className="mt-3">
        {qty === 0 ? (
          <button
            onClick={() => increaseQty(product.id)}
            className="flex h-9 w-full items-center justify-center gap-1 rounded-xl bg-red-500 text-white transition active:scale-95"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span className="text-xs font-bold">Add</span>
          </button>
        ) : (
          <div className="flex h-9 items-center justify-between rounded-xl bg-red-500 px-1.5 text-white">
            <button
              onClick={() => decreaseQty(product.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 transition active:scale-90"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
            <span className="min-w-[24px] text-center text-sm font-black">
              {qty}
            </span>
            <button
              onClick={() => increaseQty(product.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 transition active:scale-90"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
