/**
 * Which billing screens a branch has switched on.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * BranchBilling.billingTypes is a free String[] and TWO different vocabularies
 * write to it in production:
 *
 *   owner-web's Settings / RestaurantSetupModal UI writes human labels —
 *     "Table Wise Billing", "Quick Billing", "Takeaway Billing"
 *   the seed generator writes enum keys (Object.keys(orderTypeMix)) —
 *     "DINE_IN", "TAKEAWAY", "DELIVERY"
 *
 * BillingPage only ever matched the human labels, so on any branch whose row
 * came from the seed NOTHING matched, billingType stayed "" and the render fell
 * through to `null` — a completely blank Billing tab, for every role. That's
 * what this normalisation fixes.
 *
 * Both spellings are accepted rather than picking a winner and migrating the
 * data: either path can still write either form, and a till silently showing
 * nothing is a far worse failure than carrying a small alias map.
 *
 * DELIVERY is deliberately absent from the result. It's an order type, not a
 * till screen — delivery orders arrive through the aggregator flow, and mapping
 * it to a billing tab would offer a screen that can't do anything useful.
 */

export type BillingScreen = "DINE_IN" | "TAKEAWAY_QUICK";

/** Normalised to upper-case with non-alphanumerics collapsed, so spacing and case can't matter. */
const canon = (v: string) => v.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");

const DINE_IN_ALIASES = new Set(["DINE_IN", "DINEIN", "TABLE_WISE_BILLING", "TABLE_BILLING"]);
const TAKEAWAY_ALIASES = new Set([
  "TAKEAWAY",
  "TAKE_AWAY",
  "TAKEAWAY_BILLING",
  "QUICK_BILL",
  "QUICK_BILLING",
]);

/** The billing screens this branch should offer, in tab order. Empty = nothing configured. */
export const resolveBillingScreens = (billingTypes: unknown): BillingScreen[] => {
  const raw = Array.isArray(billingTypes) ? billingTypes.filter((t): t is string => typeof t === "string") : [];
  const keys = new Set(raw.map(canon));
  const screens: BillingScreen[] = [];
  if ([...DINE_IN_ALIASES].some((a) => keys.has(a))) screens.push("DINE_IN");
  if ([...TAKEAWAY_ALIASES].some((a) => keys.has(a))) screens.push("TAKEAWAY_QUICK");
  return screens;
};

export const BILLING_SCREEN_META: Record<BillingScreen, { label: string; emoji: string }> = {
  DINE_IN: { label: "Dine In", emoji: "🍽" },
  TAKEAWAY_QUICK: { label: "Takeaway / Quick", emoji: "🛍" },
};
