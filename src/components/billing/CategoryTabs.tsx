import { MdRestaurant } from "react-icons/md";
import { FaFire } from "react-icons/fa";

const iconMap: any = {
  Trending: FaFire,
};

type Props = {
  categories: any[];
  selectedCategory: string;
  setSelectedCategory: any;
};

export default function CategoryTabs({
  categories,
  selectedCategory,
  setSelectedCategory,
}: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto px-2.5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((category) => {
        const active = selectedCategory === category.name;
        const Icon = iconMap[category.iconName] || MdRestaurant;

        return (
          <button
            key={category.name}
            onClick={() => setSelectedCategory(category.name)}
            className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
              active
                ? "bg-red-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Icon className={`text-xs ${active ? "text-white" : "text-gray-500"}`} />
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
