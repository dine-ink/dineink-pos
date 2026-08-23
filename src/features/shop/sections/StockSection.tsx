import { useState } from "react";
import { ClipboardCheck, Boxes, Truck } from "lucide-react";
import { SegmentedTabs, Banner } from "@/components/ui/page";
import DailyCountTab from "@/features/shop/stock/DailyCountTab";
import Inventry from "@/components/manage_shop/Inventry";

/**
 * Stock. The daily count is new; adjustments reuse the existing screen.
 *
 * ── Why there's no "Goods In" tab ──────────────────────────────────────────
 * Recording individual deliveries has no model behind it yet, and both
 * available shortcuts are worse than the gap:
 *
 *   InventoryRestock is one JSON blob per (restaurant, branch, month, year),
 *   upserted wholesale. Logging a delivery would mean read-modify-write of a
 *   whole month from a phone — two managers minutes apart would overwrite each
 *   other — and the row records neither who received it nor when.
 *
 *   InventoryAdjustment is per-row and already offline-queued, but every one of
 *   its types (DAMAGE / WASTAGE / EXPIRED / MANUAL) is an OUTWARD movement, and
 *   consumers such as getIngredientLifecycleService sum them as losses. An
 *   inward "RECEIVED" row would be counted as wastage and would corrupt figures
 *   the owner already relies on.
 *
 * So this needs a proper per-delivery table rather than a workaround. Flagged
 * rather than forced.
 */
type Tab = "count" | "adjustments";

export default function StockSection() {
  const [tab, setTab] = useState<Tab>("count");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SegmentedTabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "count", label: "Daily count", icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
          { id: "adjustments", label: "Adjustments", icon: <Boxes className="h-3.5 w-3.5" /> },
        ]}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "count" ? (
          <DailyCountTab />
        ) : (
          <div className="flex h-full min-h-0 flex-col overflow-y-auto">
            <div className="p-3 sm:p-4">
              <Banner tone="info" icon={<Truck className="h-4 w-4" />} title="Recording stock coming in">
                Adjustments below cover stock going out — wastage, damage, expiry. Deliveries arriving still need to be
                logged from owner-web; a per-delivery record is pending a backend change.
              </Banner>
            </div>
            <Inventry />
          </div>
        )}
      </div>
    </div>
  );
}
