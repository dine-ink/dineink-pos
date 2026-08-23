import { resolveBillingScreens, BILLING_SCREEN_META } from "@/constants/billing";

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
  // Shared with BillingPage so the tab strip and the screen it switches to can
  // never disagree about which billing types a branch has enabled. This used to
  // match only owner-web's human labels and missed the enum spelling entirely —
  // see constants/billing.ts.
  //
  // Take Away and Quick Bill share one tab/screen: which of the two an order
  // actually is gets picked at checkout, right before the bill is generated,
  // instead of forcing that choice upfront here.
  const billingTabs = resolveBillingScreens(branchData?.billing?.billingTypes).map((key) => ({
    key,
    ...BILLING_SCREEN_META[key],
  }));

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
