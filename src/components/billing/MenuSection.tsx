import { memo } from "react";
import { MdRestaurant } from "react-icons/md";
import { FaFire } from "react-icons/fa";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ProductCard from "./ProductCard";
import { EmptyState } from "@/components/ui/empty-state";

const iconMap: any = { Trending: FaFire };

type Props = {
  categories: any[];
  selectedCategory: string;
  setSelectedCategory: any;
  productsByCategory: Map<string, any[]>;
  activeCart: any;
  increaseQty: any;
  decreaseQty: any;
};

// Swiggy/Zomato-style category browsing: tapping a category expands it in
// place and collapses whichever was open — `selectedCategory` is reused as
// "the currently expanded category" instead of "the currently filtered one".
function MenuSection({
  categories,
  selectedCategory,
  setSelectedCategory,
  productsByCategory,
  activeCart,
  increaseQty,
  decreaseQty,
}: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Accordion
          type="single"
          collapsible
          value={selectedCategory}
          onValueChange={(value) => setSelectedCategory(value || selectedCategory)}
        >
          {categories.map((category) => {
            const Icon = iconMap[category.iconName] || MdRestaurant;
            const items = productsByCategory.get(category.name) || [];
            return (
              <AccordionItem key={category.name} value={category.name}>
                <AccordionTrigger>
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
                      <Icon className="text-sm text-red-500" />
                    </span>
                    <span className="truncate">{category.name}</span>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                      {items.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {items.length === 0 ? (
                    <EmptyState icon={<span className="text-xl">🍽</span>} title="No items in this category" className="py-8" />
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
                      {items.map((product: any) => (
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
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}

export default memo(MenuSection);
