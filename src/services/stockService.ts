import { api } from "./api";
import { enqueueAction, isNetworkError } from "@/utils/offlineQueue";

/**
 * Daily stock count and goods-in. Both happen at the two moments a till is
 * least likely to have a reliable connection — close of day, and a delivery
 * arriving through a back door — so both writes queue offline rather than
 * failing. Neither is idempotent server-side, so the queue's create-only
 * "generic" replay is the right shape: one POST, replayed once.
 */

/** Exactly the row getDailyAuditPreviewService returns — field names match it 1:1. */
export interface AuditRow {
  ingredientId: number;
  name: string;
  unit: string;
  pricePerUnit: number;
  openingQty: number;
  /** Consumption the recipe mapping predicts from the day's paid bills. */
  sopConsumed: number;
  /** opening - sopConsumed, i.e. what the shelf should hold if nothing was wasted. */
  expectedClosing: number;
  /** null = not yet counted. Non-null once this date has been saved. */
  closingQty: number | null;
  /** Positive = wastage (used more than the recipe expected). null until counted. */
  wastage: number | null;
  notes: string | null;
  auditSaved: boolean;
}

export const getDailyAuditPreview = async (branchId: number, date: string) => {
  const res = await api.get(`/inventory/daily-audit/preview?branchId=${branchId}&date=${date}`);
  return res.data;
};

export const getDailyAuditHistory = async (branchId: number, from?: string, to?: string) => {
  const qs = new URLSearchParams({ branchId: String(branchId) });
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const res = await api.get(`/inventory/daily-audit/history?${qs.toString()}`);
  return res.data;
};

/**
 * Upserts one row per ingredient for `date`. restaurantId is taken from the
 * token server-side, so it is deliberately absent here.
 *
 * The server derives wastage itself as (openingQty - sopConsumed) - closingQty,
 * which is why openingQty and sopConsumed have to be echoed back rather than
 * only the counted figure — sending just closingQty would leave it computing
 * wastage against zeroes.
 */
export const saveDailyAudit = async (payload: {
  branchId: number;
  date: string;
  entries: {
    ingredientId: number;
    closingQty: number;
    openingQty: number;
    sopConsumed: number;
    notes?: string;
  }[];
}) => {
  try {
    const res = await api.post("/inventory/daily-audit", payload);
    return res.data;
  } catch (err: any) {
    if (isNetworkError(err)) {
      enqueueAction(
        "/inventory/daily-audit",
        payload,
        `Stock count for ${payload.date} (${payload.entries.length} items)`,
        "generic",
      );
      return { success: true, queuedOffline: true };
    }
    throw err;
  }
};

// ── Restock history (read-only from the POS) ────────────────────────────────
//
// NOT a per-delivery goods-in log, despite the name. InventoryRestock is one
// JSON blob per (restaurant, branch, month, year) — @@unique on those four —
// upserted wholesale, so "record this delivery" would mean read-modify-write of
// a whole month's data from a phone. Two managers logging deliveries minutes
// apart would silently overwrite each other, and nothing in the row records
// who received what or when.
//
// Exposed read-only for that reason. See the note in StockSection for why
// per-delivery goods-in is left for a proper backend model rather than forced
// through either this or InventoryAdjustment (whose types are all outward, so
// an inward row would be counted as wastage by every consumer that sums them).

export const getRestockHistory = async (restaurantId: number, branchId?: number) => {
  const qs = branchId ? `?branchId=${branchId}` : "";
  const res = await api.get(`/inventory/${restaurantId}/get-restock-history${qs}`);
  return res.data;
};

// ── Ingredients ─────────────────────────────────────────────────────────────

export const getIngredients = async (restaurantId: number) => {
  const res = await api.get(`/ingredients/${restaurantId}/getRestaurantIngredients`);
  return res.data;
};

export const getReorderAlerts = async (restaurantId: number) => {
  const res = await api.get(`/ingredients/${restaurantId}/reorder-alerts`);
  return res.data;
};
