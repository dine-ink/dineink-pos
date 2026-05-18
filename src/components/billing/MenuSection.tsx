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
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* ================= CATEGORY SECTION ================= */}

      <div className="border-b border-gray-100 bg-white">
        <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
      </div>

      {/* ================= PRODUCTS ================= */}

      <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-3 xl:p-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 xl:gap-4 2xl:grid-cols-4">
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

        {/* EMPTY STATE */}

        {filteredProducts.length === 0 && (
          <div className="flex h-full items-center justify-center py-20">
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-700">
                No Items Found
              </h2>

              <p className="mt-2 text-sm text-gray-500">Try another category</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
