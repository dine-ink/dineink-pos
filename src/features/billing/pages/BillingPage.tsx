import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import BillingTypeTabs from "../../../components/billing/BillingTypes";
import DineIn from "./DineIn_Billing";
import NormalBilling from "./Quick_Takeaway_Billing";

export default function BillingPage() {
  const [step, setStep] = useState<"MENU" | "CART" | "CUSTOMER">("MENU");
  const [billingType, setBillingType] = useState("DINE_IN");
  const [selectedTable, setSelectedTable] = useState<any>(null);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8fafc]">
      {/* ================= HEADER ================= */}
      <div className="border-b border-gray-200 bg-white px- py-3 shadow-sm">
        <div className="flex items-center justify-between">
          {/* BILL TYPES */}
          <BillingTypeTabs
            billingType={billingType}
            setBillingType={setBillingType}
            setSelectedTable={setSelectedTable}
          />
          <button
            onClick={() => setStep("CART")}
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>
        </div>
      </div>
      {/* ================= CONTENT ================= */}
      <div className="flex-1 overflow-hidden">
        {/* DINE IN */}
        {billingType === "DINE_IN" && (
          <DineIn
            step={step}
            setStep={setStep}
            selectedTable={selectedTable}
            setSelectedTable={setSelectedTable}
          />
        )}
        {/* TAKE AWAY / QUICK BILL */}
        {(billingType === "TAKE_AWAY" || billingType === "QUICK_BILL") && (
          <NormalBilling
            billingType={billingType}
            step={step}
            setStep={setStep}
          />
        )}
      </div>
    </div>
  );
}
