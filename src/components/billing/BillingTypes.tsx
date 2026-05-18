type Props = {
  billingType: string;
  setBillingType: any;
  setSelectedTable: any;
};

export default function BillingTypeTabs({
  billingType,
  setBillingType,
  setSelectedTable,
}: Props) {
  return (
    <div className="mt-4 flex gap-2 overflow-x-auto">
      {[
        {
          key: "DINE_IN",
          label: "Dine In",
        },

        {
          key: "TAKE_AWAY",
          label: "Take Away",
        },

        {
          key: "QUICK_BILL",
          label: "Quick Billing",
        },
      ].map((type) => {
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
