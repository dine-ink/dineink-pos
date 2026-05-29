type Props = {
  billingType: string;
  setBillingType: any;
  setSelectedTable: any;
  branchData: any;
};

export default function BillingTypeTabs({
  billingType,
  setBillingType,
  setSelectedTable,
  branchData,
}: Props) {
  const billingTypes = branchData?.billing?.billingTypes || [];

  const billingTabs = [];
  if (billingTypes.includes("Table Wise Billing")) {
    billingTabs.push({ key: "DINE_IN", label: "Dine In", emoji: "🍽" });
  }
  if (billingTypes.includes("Takeaway Billing")) {
    billingTabs.push({ key: "TAKE_AWAY", label: "Take Away", emoji: "🛍" });
  }
  if (billingTypes.includes("Quick Billing")) {
    billingTabs.push({ key: "QUICK_BILL", label: "Quick Bill", emoji: "⚡" });
  }

  if (billingTabs.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 overflow-x-auto [scrollbar-width:none]">
      {billingTabs.map((type) => {
        const active = billingType === type.key;
        return (
          <button
            key={type.key}
            onClick={() => {
              setBillingType(type.key);
              setSelectedTable(null);
            }}
            className={`shrink-0 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              active
                ? "bg-red-500 text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:text-red-600"
            }`}
          >
            <span className="text-xs">{type.emoji}</span>
            {type.label}
          </button>
        );
      })}
    </div>
  );
}
