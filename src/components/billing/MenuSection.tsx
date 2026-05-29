import CategoryTabs from "./CategoryTabs";
import ProductCard from "./ProductCard";

type Props = {
  categories: any[];
  selectedCategory: string;
  setSelectedCategory: any;
  filteredProducts: any[];
  activeCart: any;
  increaseQty: any;
  decreaseQty: any;
};

export default function MenuSection({
  categories,
  selectedCategory,
  setSelectedCategory,
  filteredProducts,
  activeCart,
  increaseQty,
  decreaseQty,
}: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* CATEGORY TABS */}
      <div className="shrink-0 border-b border-gray-100">
        <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
      </div>

      {/* PRODUCT GRID */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {filteredProducts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 py-12 text-center">
            <span className="text-2xl">🍽</span>
            <p className="text-xs font-bold text-gray-700">No items found</p>
            <p className="text-[11px] text-gray-500">Try another category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredProducts.map((product: any) => (
              <ProductCard
                key={product.id}
                product={product}
                qty={activeCart[product.id] || 0}
                increaseQty={increaseQty}
                decreaseQty={decreaseQty}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
