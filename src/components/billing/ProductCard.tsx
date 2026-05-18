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
    <div className="flex h-[150px] flex-col justify-between rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <div>
        <div className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-semibold text-red-600">
          Bestseller
        </div>
        <h2 className="mt-2 line-clamp-2 text-sm font-semibold text-gray-900">
          {product.name}
        </h2>
        <p className="mt-2 text-xl font-black text-red-600">₹{product.price}</p>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-red-500 px-2 py-1.5 text-white">
        <button
          onClick={() => decreaseQty(product.id)}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold">{qty}</span>
        <button
          onClick={() => increaseQty(product.id)}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
