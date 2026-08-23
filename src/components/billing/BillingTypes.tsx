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
  // Take Away and Quick Bill share one tab/screen now — which of the two an
  // order actually is gets picked at checkout, right before the bill is
  // generated, instead of forcing that choice upfront here.
  if (billingTypes.includes("Takeaway Billing") || billingTypes.includes("Quick Billing")) {
    billingTabs.push({ key: "TAKEAWAY_QUICK", label: "Takeaway / Quick", emoji: "🛍" });
  }

  if (billingTabs.length === 0) return null;

  return (
    <div className="hide-scrollbar flex items-center gap-1.5 overflow-x-auto px-2.5 py-2">
      {billingTabs.map((type) => {
        const active = billingType === type.key;
        return (
          <button
            key={type.key}
            onClick={() => {
              setBillingType(type.key);
              setSelectedTable(null);
            }}
            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-control px-3.5 text-[0.8125rem] font-bold transition-colors ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span>{type.emoji}</span>
            {type.label}
          </button>
        );
      })}
    </div>
  );
}
