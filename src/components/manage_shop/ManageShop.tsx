import { ClipboardList, Boxes, ChartNoAxesColumn } from "lucide-react";
import { useState } from "react";
import Attendance from "./Attendance";
import Expense from "./Expense";
import Inventry from "./Inventry";

const tabs = [
  { id: "Attendance", label: "Attendance", icon: ChartNoAxesColumn },
  { id: "Expense Details", label: "Expenses", icon: ClipboardList },
  { id: "Update Inventory", label: "Inventory", icon: Boxes },
];

export default function ManageShop() {
  const [tab, setTab] = useState("Attendance");

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* TAB BAR */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-3 py-2">
        <div className="flex items-center gap-1.5">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? "border-red-500 bg-red-500 text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:text-red-600"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "Attendance" && <Attendance />}
        {tab === "Expense Details" && <Expense />}
        {tab === "Update Inventory" && <Inventry />}
      </div>
    </div>
  );
}
