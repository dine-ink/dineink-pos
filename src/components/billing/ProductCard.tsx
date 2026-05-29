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
    <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md">
      {/* NAME & PRICE */}
      <div>
        <h3 className="line-clamp-2 text-xs font-semibold leading-tight text-gray-900">
          {product.name}
        </h3>
        <p className="mt-1 text-sm font-black text-red-600">
          ₹{product.price}
        </p>
      </div>

      {/* ADD / STEPPER */}
      <div className="mt-2">
        {qty === 0 ? (
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
