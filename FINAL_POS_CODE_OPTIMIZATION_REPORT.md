# DineInk POS — Code Optimization Report (Phase 1)

Scope: internal code quality only. No business logic, API contracts, or UI/UX redesign was introduced. One deliberate exception is called out explicitly in "Formatting standardization" below — a small, approved, visible fix to inconsistent currency/date rendering.

Stack note: the codebase uses React + TypeScript + Vite + Tailwind + radix-ui/shadcn + Redux Toolkit + Capacitor. (The task brief mentioned MUI; the project does not use MUI — this report reflects the actual stack.)

## Files reviewed

Full read of the billing feature (`DineIn_Billing.tsx`, `Quick_Takeaway_Billing.tsx`, `BillingPage.tsx`, `CustomerSection.tsx`, `CartSection.tsx`, `AddOnSelectorModal.tsx`, `ProductCard.tsx`, `MenuSection.tsx`, `CategoryTabs.tsx`, `BillingTypes.tsx`, `BillingHeader.tsx`, `TableInfoBar.tsx`), `utils/printer.ts`, `utils/offlineQueue.ts`, all of `components/manage_shop/*`, `features/orders/pages/OrdersPage.tsx`, `features/kitchen/pages/KitchenPage.tsx`, `features/online-orders/pages/LiveOrdersPage.tsx`, `layouts/MainLayout.tsx`, `components/PrinterSetupModal.tsx`, `routes/ProtectedRoutes.tsx`, `app/router.tsx`, `components/ui/sidebar.tsx`, all 16 files in `services/`, all of `store/` (index, hooks, slices), `lib/utils.ts`, `hooks/use-mobile.ts`, `hooks/useOnlineStatus.ts`. ~11,500 lines across ~60 files.

## Optimizations performed

### Dead code removed
- **Redux**: `store/slices/cartSlice.ts`, `billingSlice.ts`, `orderSlice.ts` (136 lines) — confirmed zero references anywhere outside their own files (exhaustive grep for every action creator and `state.cart`/`state.billing`/`state.order` selector access). `redux-persist` already only whitelisted `auth`, and every billing screen manages cart/discount/order-type state with local `useState` instead. Store now only wires `authReducer`.
- **Dead files**: `services/categoryService.ts`, `services/tableService.ts` (single unused export each), `components/ui/sidebar.tsx` (702 lines of unmodified shadcn boilerplate, imported nowhere), `hooks/use-mobile.ts` (was only consumed by `sidebar.tsx`), `components/billing/BillingHeader.tsx`, `components/billing/TableInfoBar.tsx` (both fully built, never imported).
- **Orphaned pair**: `inventoryAdjustmentService.ts`'s `getInventoryUsers` export + the dead commented-out `users` state and unused `Inventory` type in `Inventry.tsx` — leftover from a removed feature.
- **Anti-pattern fix**: `Inventry.tsx` called `setCurrentPage(1)` as a side effect inside a `useMemo` body; moved to a `useEffect` keyed on `search` (same reset behavior, correct lifecycle hook).

### Duplicate logic removed
- **`src/utils/format.ts`** (new) — `formatCurrency`, `formatLongDate`, `formatShortDate`, `formatTime`. Replaced ~50 inline currency/date/time formatting call sites across `CustomerSection.tsx`, `CartSection.tsx`, `OrdersPage.tsx`, `LiveOrdersPage.tsx`, `Expense.tsx`, `Inventry.tsx`, `Attendance.tsx`, `CashSession.tsx` that had drifted into 4 different currency styles and 4 different date/time styles.
- **`utils/printer.ts`** — consolidated 3 near-duplicate inline date/time-building blocks (`buildReceipt`, `buildTestReceipt`, `printReceiptBrowser`) into two private helpers (`receiptDateString`, `receiptTimeString`/`receiptTimeShort`). Printer output format is unchanged — this is a printer-specific concern kept separate from the UI formatter above (ASCII/HTML receipts can't use `₹`).
- **`src/hooks/usePolling.ts`** (new) — replaced 5 hand-rolled `setInterval`/`clearInterval` blocks in `BillingPage.tsx`, `KitchenPage.tsx`, and `MainLayout.tsx` (×3), each with identical interval values and dependency triggers preserved.
- **`src/hooks/useSearchFilter.ts`** (new) — replaced 3 divergent hand-rolled `.toLowerCase().includes()` filters in `Attendance.tsx`, `Expense.tsx`, `Inventry.tsx` (one single-field, one recomputing `.toLowerCase()` 4×, one already hoisting it) with one hook; each screen still supplies its own field list, so match scope is unchanged.
- **`src/constants/payment.ts`** (new) — `PAYMENT_SOURCE`/`PAYMENT_SOURCES` replacing 6 independent inline occurrences of `"SHOP_CASH"`/`"EMPLOYEE_PAID"` (and their labels) in `Expense.tsx`.
- **`src/constants/inventory.ts`** (new) — `ADJUSTMENT_TYPES` replacing the hardcoded `<option>` list + default-value literal in `Inventry.tsx`.
- **`src/constants/roles.ts`** (new) — `canManageBilling(role)` replacing 3 repeated `role === "MANAGER" || role === "CASHIER"` checks inside `CartSection.tsx`.

### Formatting standardization (small visible fix, approved before implementation)
Several screens showed the same figure inconsistently (e.g. an unrounded `₹142.5` in one place vs. `₹142.50` in another for the same total; a compact `29 Jul 2026` vs. a full `Sunday, 29 July 2026` for "today"). Per explicit approval, the shared formatters now standardize on: currency → `₹` with `en-IN` thousands grouping and always 2 decimals; long dates → `en-GB, 2-digit day, long month, year`; short dates → `en-GB` default; times → `en-IN, 2-digit hour/minute`. This is a cosmetic consistency fix, not a calculation change — all underlying GST/discount/total math in `CustomerSection.tsx` was untouched and verified single-sourced (see below).

## Explicitly left alone (verified, not duplicated)
- GST/CGST/SGST, discount, service-charge, round-off, and tip math: single source of truth in `CustomerSection.tsx` — confirmed via grep that no other file recomputes these.
- Offline-queue primitives (`isNetworkError`, `enqueueAction`, `flushQueue`) in `utils/offlineQueue.ts` — already properly centralized and consumed via the service layer.
- `DineIn_Billing.tsx` received **zero edits** in this pass (see Remaining recommendations — it's the highest-risk file in the app and was deliberately deferred).

## Technical debt found but not touched this pass
- **`DineIn_Billing.tsx` (1,908 lines)** mixes 8 responsibilities in one component (table/floor management, cart+add-on state machine duplicated near-verbatim with `Quick_Takeaway_Billing.tsx`, KOT persistence, a hand-rolled cart-step UI that duplicates `CartSection.tsx` instead of reusing it, bill generation + offline fallback, and bespoke KOT print HTML that bypasses `utils/printer.ts`). It also has 3 internal KOT-status-badge ternary chains that could collapse to one lookup, and a `handleGenerateBill` control flow that's near-verbatim duplicated with `OrdersPage.tsx`'s `handleCompleteOrder`.
- **`Expense.tsx`/`Inventry.tsx`** duplicate a full CRUD inline-edit-row state machine (`handleChange`/`handleAdd*`/`handleSave`/`handleDelete`), near line-for-line.
- **Ambiguous/possibly-intentional exports, left in place**: `holdRunningOrder`/`resumeRunningOrder`/`discardRunningOrder` in `runningOrderService.ts` (backend supports these; the frontend currently does hold/resume via `localStorage` instead), `discountService.ts`'s CRUD (`getDiscountCodes`/`create`/`update`/`delete` — only `validateDiscountCode` is used), `menuService.ts`'s `getMenuItems`, `billService.ts`'s `getBills`. Each plausibly maps to a near-term or backend-supported feature; recommend a product decision on whether to wire them up or remove them.
- **`CashSession.tsx`**'s `printShiftSummary` embeds a ~60-line HTML/CSS receipt template inline in the component — a self-contained, testable unit that would be cleaner extracted to a utils file, independent of anything else in this pass.
- Only 2 of 16 service files (`billService.ts`, `runningOrderService.ts`) have any error handling/offline-queue wrapping; the other ~55 functions across the remaining 14 files let raw Axios errors propagate — every calling component re-implements its own try/catch/toast. A generic `unwrap`/CRUD-factory helper at the service layer, or a `useApiCall` hook at the component layer, would remove real duplication here (~60 near-identical `await api.X(...); return response.data;` bodies).
- Minor naming inconsistencies: `authService.ts`'s `loginApi` (vs. plain verb-first naming elsewhere), `menuService.ts`'s `setMenuItemAvailability` (a `set*` verb for what's functionally an `update*`), and `cancelBill`/`refundBill` living in `runningOrderService.ts` rather than `billService.ts`.
- `router.tsx`: the `/app/billing` route is the only one not wrapped in `<ProtectedRoute>` — a KITCHEN-department user navigating there directly by URL isn't redirected the way they would be for every other route. Worth a fix or an explicit "intentional" note.
- `CustomerSection.tsx:30` — `const [subtotal] = useState(grand_Total)` freezes the incoming prop into local state with no setter; harmless today since the prop doesn't change after mount, but a latent staleness risk if that ever changes. Left untouched to avoid any behavior change.

## Bundle impact
Measured via `npm run build` (production, gzip sizes as reported by Vite):

| | Before | After |
|---|---|---|
| Total `dist` (js+css) | 720,649 bytes | 706,036 bytes (−14.6 KB, ~2%) |
| `index.css` | 81.43 kB (14.01 kB gzip) | 69.79 kB (12.35 kB gzip) |
| Main `index.js` chunk | 428.25 kB (142.41 kB gzip) | 426.72 kB (141.99 kB gzip) |

The CSS drop is mostly the removed `sidebar.tsx`'s Tailwind classes no longer being scanned; the JS drop reflects the deleted dead Redux slices and services no longer being bundled.

## Validation
- `tsc -b` — clean, no errors.
- `npm run lint` — 235 problems (221 errors, 14 warnings) after these changes vs. a baseline of 238 problems (225 errors, 13 warnings) measured on the pre-change code via `git stash`. No new error categories introduced; the remaining errors are pre-existing (`@typescript-eslint/no-explicit-any` throughout the service/store layer, and React Compiler `set-state-in-effect`/`refs` findings in `KitchenPage.tsx`/`OrdersPage.tsx`/`MainLayout.tsx` that predate this pass).
- `npm run build` — production build succeeds.
- Dev server (`npm run dev`) starts and serves the SPA shell without console/build errors. Full interactive click-through (login → billing → orders → manage-shop) was **not** performed — this environment has no running backend/credentials and no browser-automation tool available, so feature-level UI verification should be done manually before merging.

## Remaining recommendations (deferred, not executed this pass)
1. **Split `DineIn_Billing.tsx`** — extract floor-management drawer, a shared `useCartWithAddOns` hook (dedup with `Quick_Takeaway_Billing.tsx`), the KOT-print builder, and switch its cart-step JSX to reuse `CartSection.tsx`. Highest value, highest risk (main dine-in revenue screen) — do as its own reviewed change with manual QA on dine-in billing.
2. **Shared CRUD row-editing hook** for `Expense.tsx`/`Inventry.tsx`.
3. **Service-layer error handling** — decide on a generic wrapper so error handling isn't reimplemented per component.
4. Resolve the ambiguous "possibly scaffolded" service exports (delete or wire up).
5. Fix or document the `/app/billing` route-guard asymmetry.
6. Extract `CashSession.tsx`'s inline print-receipt template.
