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
  console.log(branchData, "=branchData");
  const billingTypes = branchData?.billing?.billingTypes || [];

  // ================= BILLING TYPE MAPPING =================

  const billingTabs = [];

  if (billingTypes.includes("Table Wise Billing")) {
    billingTabs.push({
      key: "DINE_IN",

      label: "Dine In",
    });
  }

  if (billingTypes.includes("Takeaway Billing")) {
    billingTabs.push({
      key: "TAKE_AWAY",

      label: "Take Away",
    });
  }

  if (billingTypes.includes("Quick Billing")) {
    billingTabs.push({
      key: "QUICK_BILL",

      label: "Quick Billing",
    });
  }
  return (
    <div className="mt-4 flex gap-2 overflow-x-auto">
      {billingTabs.map((type) => {
        const active = billingType === type.key;

        return (
          <button
            key={type.key}
            onClick={() => {
              setBillingType(type.key);

              setSelectedTable(null);
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              active
                ? "bg-red-500 text-white"
                : "border border-gray-200 bg-white text-gray-700"
            }`}
          >
            {type.label}
          </button>
        );
      })}
    </div>
  );
}
