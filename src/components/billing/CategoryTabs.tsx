import { MdRestaurant } from "react-icons/md";

const iconMap: any = {};

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
    <div className="hide-scrollbar flex gap-3 overflow-x-auto border-b border-gray-100 bg-white px-4 py-3">
      {categories.map((category) => {
        const active = selectedCategory === category.name;

        const Icon = iconMap[category.iconName] || MdRestaurant;

        return (
          <button
            key={category.name}
            onClick={() => setSelectedCategory(category.name)}
            className={`flex min-w-[85px] flex-col items-center gap-2 rounded-2xl border px-3 py-3 ${
              active
                ? "border-red-200 bg-red-500 text-white"
                : "border-gray-200 bg-white text-gray-700"
            }`}
          >
            <Icon className="text-2xl" />

            <span className="text-[11px] font-semibold">{category.name}</span>
          </button>
        );
      })}
    </div>
  );
}
