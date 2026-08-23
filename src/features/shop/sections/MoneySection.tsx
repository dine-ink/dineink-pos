import { useState } from "react";
import { Wallet, ClipboardList } from "lucide-react";
import { SegmentedTabs } from "@/components/ui/page";
import CashSession from "@/components/manage_shop/CashSession";
import Expense from "@/components/manage_shop/Expense";

/**
 * Cash sessions and expenses. Both already existed and both work, so this
 * section reuses those components as-is rather than reimplementing them — the
 * brief was to add what's missing and restyle, not to rewrite working
 * money-handling code, which is the last place to introduce a regression.
 */
type Tab = "cash" | "expenses";

export default function MoneySection() {
  const [tab, setTab] = useState<Tab>("cash");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SegmentedTabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "cash", label: "Cash session", icon: <Wallet className="h-3.5 w-3.5" /> },
          { id: "expenses", label: "Expenses", icon: <ClipboardList className="h-3.5 w-3.5" /> },
        ]}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tab === "cash" ? <CashSession /> : <Expense />}
      </div>
    </div>
  );
}
