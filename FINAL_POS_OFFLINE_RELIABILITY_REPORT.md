# DineInk POS — Phase 5: Offline Reliability, Data Integrity & Synchronization Report

## 1. Executive Summary

Phase 5 audited every path in the app where a network blip during a live shift could lose operational data, and closed the concrete gaps found. The existing offline foundation — a localStorage-backed FIFO queue (`src/utils/offlineQueue.ts`) already protecting KOT placement and DineIn bill creation, with provisional bill numbers and automatic reprint-on-sync — was sound and is left structurally intact. Nine fixes were made on top of it:

1. **Logout no longer wipes the offline queue.** `MainLayout.tsx`'s sign-out used to call `localStorage.clear()` unconditionally, destroying any unsynced bills/orders, held orders, and the offline bill-sequence counter. It now removes only the auth session (`persist:root`).
2. **An expired/invalid token (401) can no longer permanently delete queued bills/orders.** The sync loop used to treat any HTTP response — including a 401 — as "the server rejected this data, drop it." It now recognizes 401 and 5xx as transient (keep queued, retry later) and only drops genuine data-validation rejections (400/404/409/422). A one-time, non-disruptive toast prompts re-login without navigating away from an in-progress screen.
3. **Cash Session open, Attendance clock-in/out, Expense entry, and Inventory adjustment creation now queue offline** exactly like KOT/bill creation already did — previously these four had zero offline fallback and simply failed.
4. **Quick/Takeaway billing's invoice-close step now queues on a network failure** the same way DineIn's already did, instead of leaving the invoice uncommitted with a "complete it manually later" message.
5. **Offline-queue writes can no longer throw uncaught** on a full/corrupted device storage — they're caught and surfaced as a clear toast instead of crashing the very save they were supposed to protect.
6. **Split Table, Merge Table, and temp-table delete now handle network failures** with a visible error instead of silently doing nothing (unhandled promise rejections).
7. **A blocked print pop-up (KOT or auto-reprint after sync) now shows an error** instead of silently dropping the ticket/receipt.
8. **The manager-override discount-approval message is now accurate offline** ("no connection" instead of "incorrect password") — the underlying security gate is unchanged.
9. **Held-order IDs no longer risk colliding** within the same millisecond.

No screen was redesigned, no workflow changed, no business logic altered, and no new component library or storage engine introduced. All changes are additive error-handling, retry-classification, and queue-coverage extensions on top of the existing architecture.

## 2. Offline Architecture Review

The app has no service worker and no IndexedDB — it's a Capacitor-packaged SPA whose JS/CSS bundle loads from local APK assets (not the network), so a fully offline cold start still renders normally. Persistent state lives in two independent places:

- **Redux + redux-persist** (`src/store/index.ts`) persists only the `auth` slice to `localStorage` under `persist:root`. No other app state goes through Redux.
- **The offline queue and related drafts** (`src/utils/offlineQueue.ts`) live in raw `localStorage` under their own keys (`dineink_offline_queue`, `dineink_offline_bill_seq`), completely independent of Redux. Held orders (`held_orders_*`) and the saved printer config (`dineink_printer`) are similarly independent, plain `localStorage` reads/writes with their own try/catch.

These two stores were never meant to be, and are not, kept in lockstep — there's no shared "what's synced" ledger between them. That's fine as long as nothing wipes one without the other realizing it, which was exactly the logout bug (Finding 1) — fixed this phase.

Auth: `src/services/api.ts`'s request interceptor attaches the current token to every call; there was and still is no response interceptor for a global session-expiry redirect. That gap is deliberately not closed with a forced redirect (see §7) — the fix instead makes the offline queue behave safely in the presence of an expired token, since a forced navigation away from an in-progress bill was judged the bigger risk.

## 3. Offline Queue Audit

`enqueueAction`/`enqueueBillAction`/`flushQueue` in `offlineQueue.ts` remain the single mechanism for offline writes; this phase extended and hardened it rather than replacing it:

- **Type union widened** from `"order" | "bill"` to `"order" | "bill" | "generic"` — `"generic"` is the new catch-all for the four newly-protected create actions (cash session open, attendance login/logout, expense create, inventory adjustment create), which need no special post-sync side effect beyond a plain POST replay.
- **`enqueueAction` gained an optional 4th parameter** (`type`, defaulting to `"order"`) so existing call sites (`saveRunningOrder`) are unaffected while new ones can pass `"generic"` explicitly.
- **`makeId` (the collision-resistant `Date.now()+random` ID generator) is now exported** for reuse outside the queue itself — used to fix the held-order ID collision risk (Finding 9) without duplicating the logic.
- **`writeQueue` now returns a boolean and never throws** — a `QuotaExceededError` or any other storage failure is caught, surfaced as a toast ("device storage is full"), and reported back as `false` instead of propagating an uncaught exception up through whatever offline action triggered it.
- **Retry classification (`isRetryableError`)** replaces the old binary "network error or drop" logic (see §7 for the full rationale and §6 for conflict-handling implications).
- **Ordering, dedup, and dependent-item handling are unchanged**: still strictly FIFO, still no idempotency key end-to-end, still no generic client-ID → server-ID remapping beyond the existing bespoke table-order-into-bill folding logic. These were reviewed and are documented as remaining debt (§14), not touched this phase — see the rationale there.

## 4. Synchronization Review

- **Automatic sync** — unchanged mechanism: `MainLayout.tsx`'s `trySync()` runs on reconnect (`isOnline` flipping true) and every 15 seconds while online, via `usePolling`. `flushQueue`'s in-memory `flushPromise` guard (unchanged) still prevents these two triggers from double-submitting the same queued items.
- **Manual sync** — still none; not added this phase (would be a UI addition beyond the error-handling/reliability scope, and the automatic 15s retry already covers the realistic recovery window).
- **Conflict detection/resolution** — still none; `flushQueue` POSTs the stored body as-is and lets the server's own validation be the only gate. This is unchanged and documented as debt (§14) — building real conflict resolution (e.g. comparing a queued mutation against current server state before replay) is a materially larger change than "fix reliability issues" and was out of scope.
- **Duplicate prevention / out-of-order updates** — the FIFO ordering guarantee and the one bespoke dependent-item case (a table's queued KOTs folded into its offline-generated bill, then stripped from the queue via `removeQueuedOrdersForTable`) are unchanged. What *did* change: a 401/5xx no longer causes a false "duplicate on retry" risk by prematurely dropping an item that actually needs to wait, not be resubmitted blind.
- **Deleted/modified records** — Expense/Inventory update and delete are still direct-API-only (not queued), per the explicitly scoped decision in §14. Attempting either while offline still fails with a clear error exactly as before; this phase didn't change that behavior, only create actions.
- **Domain-by-domain sync coverage after this phase**:

  | Domain | Create | Update | Delete |
  |---|---|---|---|
  | Dine-in/Takeaway KOT (`saveRunningOrder`) | Queued (pre-existing) | — | — |
  | Bill (`billService.createBill`, DineIn offline path) | Queued (pre-existing) | — | — |
  | Quick/Takeaway invoice (`closeRunningOrder`) | **Queued (new this phase)** | — | — |
  | Cash Session | **Queued (new this phase)** | Direct-API-only | — |
  | Attendance | **Queued (new this phase)** | — | Direct-API-only (logout) |
  | Expense | **Queued (new this phase)** | Direct-API-only | Direct-API-only |
  | Inventory Adjustment | **Queued (new this phase)** | Direct-API-only | Direct-API-only |
  | Table transfer/split/merge | Direct-API-only (unchanged; error handling added, see §8) | — | — |

## 5. Network Recovery Review

- **Network detection** — unchanged: `src/hooks/useOnlineStatus.ts` wraps `navigator.onLine` + the `online`/`offline` browser events. Still no dedicated backend-reachability ping; the existing 15s retry loop is the de facto mitigation for the well-known "online per the OS, unreachable in practice" false positive, and this wasn't touched — building a real health-check endpoint is a backend change outside this phase's scope.
- **Reconnect detection** — unchanged: the `isOnline` flip triggers an immediate `trySync()` in addition to the 15s poll.
- **User notification** — improved: sync success/drop toasts are unchanged; a new one-time, non-navigating toast now covers the specific "your session expired mid-sync" case (Finding 2), and each of the four newly-queued domains (cash/attendance/expense/inventory) now shows its own "saved offline, will sync automatically" toast matching the existing pattern from Quick/Takeaway billing.
- **Sync progress/completion/failure** — unchanged mechanism (the navbar "Syncing N" / "Live" / "Offline · N" badge, driven by `pendingSyncCount`), now additionally reflects the four new domains since they share the same queue and count.
- **Offline/online indicator** — unchanged, still purely `navigator.onLine`-driven; not modified this phase.

## 6. Data Integrity Review

Traced against every explicit "must never disappear" item in the brief:

- **Bills** — DineIn: unchanged, already fully protected. Quick/Takeaway: now also protected (Finding 4) — previously the one gap where a bill could be left permanently uncommitted pending a human noticing.
- **KOTs** — unchanged, already fully protected (`saveRunningOrder` queues on network failure regardless of billing type).
- **Payments** — no live payment-gateway integration exists in this codebase (cash/card/UPI are all just a label on the bill/order, confirmed via search); nothing to queue or lose at this layer. Unchanged.
- **Inventory movements** — the ingredient-deduction that happens when a bill closes is already atomic with bill creation in the same backend transaction (`bill.service.ts`/`runningOrder.service.ts`, confirmed via the backend source) — unaffected by this phase. Manual inventory *adjustments* (the `Inventry.tsx` screen) are the ones newly protected (Finding 3).
- **Expenses** — newly protected for creation (Finding 3); edits/deletes remain direct-API-only, a scoped, documented limitation (§14).
- **Attendance records** — newly protected for clock-in/clock-out (Finding 3).
- **Cash sessions** — newly protected for opening (Finding 3); closing remains direct-API-only — closing requires a real server-assigned session ID, which a still-queued (not yet synced) session doesn't have yet, so the UI now explicitly disables "Close Session" and explains why until the open syncs, rather than silently failing or allowing a call that can't succeed.

## 7. Conflict Resolution Review

No new conflict-resolution logic was built — the existing "server validation is the only gate" model is unchanged, and remains adequate for this app's actual write patterns (no two devices editing the same not-yet-synced record). What changed is strictly the *error-classification* layer feeding into that model:

- **Before**: any HTTP error response (validation failure, 401, 500, anything) → treated identically as "the server looked at this and rejected it, drop it."
- **After** (`isRetryableError` in `offlineQueue.ts`): a 401 or 5xx is recognized as *not* a judgment on the data itself — an expired token or a transient backend hiccup says nothing about whether the bill/order is valid — so these are now retried instead of dropped. Only a genuine 4xx data-rejection (400/403/404/409/422) still drops the item, unchanged from before.
- This was verified against the actual backend contract rather than assumed: `dineink-backend/src/middleware/auth.ts` confirms every authenticated-route 401 is a token/session problem ("Unauthorized"/"Token expired"/"Invalid token"), **except** `POST /auth/verify-manager-override`, whose handler (`auth.controller.ts:128-136`) deliberately reuses status 401 for "wrong manager password" — a business rejection, not a session problem. That endpoint isn't part of the offline queue at all (it's a live-only approval gate, see §8), so this distinction didn't require any endpoint-specific carve-out in `flushQueue` itself — it only mattered for correctly scoping the manager-override message fix.

## 8. Offline Billing Review

Every workflow listed in the brief was traced end-to-end:

- **Create/Update Bill** — DineIn and now Quick/Takeaway both queue safely offline (§4 table). "Update" in the sense of editing an already-created bill isn't a workflow that exists in this app (bills are generated once at checkout); not applicable.
- **Delete Bill** — `cancelBill`/`refundBill` (`runningOrderService.ts`) remain direct-API-only, unchanged — these are manager-gated corrective actions on an already-synced, already-paid bill; queuing a delete/refund against a bill that might not have synced yet would need the ID-remapping this phase deliberately didn't build (§14).
- **Hold/Resume Order** — Quick/Takeaway's held-order drafts already persist to `localStorage` (survive a refresh); this phase only fixed their ID collision risk (Finding 9). DineIn has no equivalent "hold" feature (uses "Save"/KOT instead), unchanged.
- **Transfer/Merge/Split Table** — Transfer already had correct error handling; Merge/Split and temp-table delete didn't and now do (Finding 6). None of the three are queued offline — they're table-management operations that correctly require connectivity, matching Transfer's pre-existing behavior; only the missing error feedback was fixed, not the connectivity requirement itself.
- **Generate/Print KOT** — unaffected by connectivity (unchanged); the pop-up-blocked failure case is now surfaced (Finding 7).
- **Checkout/Payment** — traced fully; no gaps beyond the Quick/Takeaway invoice gap already fixed.
- **Inventory Update (from a bill)** — atomic on the backend, unaffected (§6).
- **Customer Selection, Notes, Add-ons, Discounts, GST** — all confirmed purely client-side computation with no live-API dependency, safe offline, unchanged. The one exception, **manager-override for large discounts**, is a deliberate live-only approval gate (a security control, not a bug) — offline behavior is unchanged (still blocks), only the error message is now accurate (Finding 8) instead of misleadingly claiming a wrong password.

## 9. Printer Reliability Review

- `src/utils/printer.ts`'s Bluetooth/WiFi print drivers already had try/catch and returned a boolean with no retry — unchanged; a single retry-on-failure mechanism wasn't added, since a physically out-of-range printer retrying automatically without staff awareness risks a confusing double-print once back in range, and this wasn't judged worth the added complexity for this pass.
- **What was fixed**: two previously-silent failure paths now surface a toast — (a) `DineIn_Billing.tsx`'s `printKOT`/`printOfflineKOT`, which use `window.open` directly (not `printer.ts`) and previously just returned with zero feedback if the pop-up was blocked; (b) `offlineQueue.ts`'s automatic reprint-with-real-bill-number after a successful sync, which previously ignored `printReceipt`'s return value entirely — a printer out of range at the exact moment of sync would silently drop the now-final invoice with no indication to the cashier.

## 10. Capacitor Review

- No `@capacitor/app` lifecycle listener exists (confirmed: not a dependency, no `addListener('appStateChange', ...)` anywhere) — unchanged, and not added this phase. This is acceptable because every piece of data this phase is responsible for protecting (the offline queue, held orders, printer config, the auth session) already lives in `localStorage`, which survives an Android process kill/restart independent of any lifecycle hook; only in-memory-only state (an unsaved cart mid-entry) would be lost, which is a pre-existing, documented limitation (§14), not something a lifecycle listener alone would fix without also auto-saving draft carts — out of scope for this pass.
- The two divergent `capacitor.config.ts` files (root: `webDir: "dist"`, `appName: "DineInk POS"` vs. `android/capacitor.config.ts`: `webDir: "www"`, `appName: "DineInk-POS"`) were reviewed and left untouched — this is a build-config consistency question, not an offline-reliability bug, and resolving it with confidence would require verifying the actual Android build pipeline, which carries risk beyond what this pass could safely validate. Flagged for follow-up (§15).

## 11. Files Modified

- `src/utils/offlineQueue.ts` — `isRetryableError`, `authExpired` flag on `FlushResult`, `writeQueue` try/catch, `makeId` exported, `QueuedActionType` widened, auto-reprint failure toast.
- `src/layouts/MainLayout.tsx` — logout no longer wipes the queue; one-time session-expiry toast.
- `src/services/cashService.ts` — `openCashSession` queues offline.
- `src/services/attendanceService.ts` — `loginAttendance`/`logoutAttendance` queue offline; `AttendanceRow.queuedOffline` field added.
- `src/services/expenseService.ts` — `createExpense` queues offline.
- `src/services/inventoryAdjustmentService.ts` — `createInventoryAdjustment` queues offline.
- `src/components/manage_shop/CashSession.tsx` — optimistic queued-session display; Close Session disabled until synced.
- `src/components/manage_shop/Attendance.tsx` — optimistic queued clock-in/out; toggle disabled until synced.
- `src/components/manage_shop/Expense.tsx` — optimistic queued row display; Edit/Delete disabled until synced.
- `src/components/manage_shop/Inventry.tsx` — same pattern as Expense.tsx.
- `src/features/billing/pages/Quick_Takeaway_Billing.tsx` — invoice queues on `closeRunningOrder` network failure; held-order IDs use `makeId`.
- `src/features/billing/pages/DineIn_Billing.tsx` — try/catch for split/merge/temp-table-delete; `Promise.allSettled` for `handleMarkDelivered`; pop-up-blocked toast for KOT printing.
- `src/components/billing/CustomerSection.tsx` — accurate offline message for manager-override.

13 files modified, 0 new files, 0 files deleted.

## 12. Validation Results

- **`npx tsc -b`** — clean, zero errors, run after every file group throughout implementation.
- **`npm run lint`** — compared against the pre-Phase-5 baseline via `git stash -u`/`git stash pop` (same methodology as all prior phases). No new rule categories. Category deltas: `@typescript-eslint/no-explicit-any` 195→218 (all new hits are `catch (err: any)` blocks in the newly-touched service files and `offlineQueue.ts`, matching this codebase's existing convention — verified individually), `react-hooks/set-state-in-effect` 16→17, `react-hooks/preserve-manual-memoization` 3→4, `react-refresh/only-export-components` 3→2, `react-hooks/purity` 2→1, `react-hooks/set-state-in-render` 1→0; `exhaustive-deps` (11), `no-unused-vars` (2), `refs` (2), `no-control-regex` (1) unchanged. All deltas proportional, no new categories.
- **`npm run build`** — production build succeeds (`vite build`, 826ms, 2506 modules). `ManageShop` and `BillingPage` chunks grew modestly (offline-queue wiring in 4 service files + 2 billing pages) — no bundle bloat of concern.
- **Regression checks** — re-confirmed Phase 2 memoization, Phase 3 mobile UX (accordion, touch targets), and Phase 4 shared components (`StatusBadge`, `ConfirmDialog`, `EmptyState`, `LoadingIndicator`) are all untouched; this phase's changes are confined to service-layer error handling, the offline queue, and a handful of catch blocks/optimistic-state updates — no JSX restructuring or styling changes beyond the disabled-state classes already used elsewhere in the app.

## 13. Simulated Failure Scenarios

Traced by code inspection (no test runner exists in this repo; validation is static analysis + manual code tracing, consistent with Phases 1-4's methodology):

- **Internet down mid-bill (DineIn)** — `handleGenerateBill` catches the network error, falls to `generateBillOffline`, prints a provisional bill number immediately, queues via `enqueueBillAction`. On reconnect, `flushQueue` POSTs it, prints the real invoice automatically. ✅ Unaffected by this phase (already worked); re-verified intact.
- **Internet down mid-invoice (Quick/Takeaway)** — `saveRunningOrder` succeeds (KOT placed), then `closeRunningOrder` throws a network error. **Before this phase**: invoice left uncommitted, toast says "complete manually." **After**: `enqueueBillAction` queues the close-and-bill call; provisional bill number prints immediately; real invoice syncs and reprints automatically on reconnect. ✅ Fixed (Finding 4).
- **Backend returns 500s (not fully down)** — `flushQueue` catches the 500, `isRetryableError` returns true, the item stays queued and retries on the next 15s tick rather than being dropped. ✅ Fixed (Finding 2/§7).
- **Token expires mid-sync** — `flushQueue` catches the 401 specifically, sets `authExpired`, stops (keeps everything from that point queued), `MainLayout` shows one non-navigating toast. The user finishes whatever they're doing, eventually re-logs in, and the next 15s/reconnect sync attempt succeeds with the fresh token. ✅ Fixed (Finding 2).
- **Browser refresh with a full queue** — `dineink_offline_queue` is plain `localStorage`, survives a refresh unconditionally (this was never broken); `MainLayout` remounts, reads `getQueueCount()`, resumes syncing. Unaffected by this phase.
- **Logout during an outage** — **Before**: `localStorage.clear()` destroyed the queue. **After**: only `persist:root` (auth) is cleared; the queue, held orders, printer config, and bill-sequence counter survive for whoever logs in next on that device. ✅ Fixed (Finding 1).
- **Rapid offline billing (several bills in quick succession while offline)** — each gets its own collision-resistant `makeId()`-based queue-action ID and its own incrementing provisional bill number (`nextProvisionalBillNo`, unchanged, already collision-safe); all queue in order and flush FIFO on reconnect. Unaffected by this phase (already worked) — re-verified.
- **Large offline queue (a long outage accumulating many items)** — still bounded only by `localStorage` quota; a quota-exceeded write during this phase's testing scenario is now caught and toasted instead of throwing uncaught (Finding 5). No hard cap was added — realistic single-shift volumes (URLs/JSON bodies only, no binary data) are well within typical 5-10MB per-origin limits.
- **Duplicate sync (two flush triggers overlapping)** — the pre-existing `flushPromise` module-level guard in `offlineQueue.ts` is unchanged and still prevents this within a single tab/app instance.
- **Multiple failed retries on the same stuck item** — a genuinely network-failing item still retries every 15s indefinitely (unchanged, deliberate — see §14); a *data-rejected* item is still dropped-and-reported after one attempt (unchanged); a *401/5xx*-failing item now retries indefinitely rather than being deleted after one attempt (changed, Finding 2).

## 14. Remaining Reliability Debt

- **No exponential backoff or max-retry cap** on the 15s poll for genuinely network-failing items — intentional; changing this risks reordering retries away from FIFO, and the existing behavior (retry forever every 15s while offline) is actually correct for "the device is offline," not a bug.
- **No idempotency key end-to-end** (client queue → server) — if a queued POST actually succeeds server-side but the client never receives the response (e.g. connection drops the instant after the server commits), the next sync retries it, creating a duplicate. This is a pre-existing architectural gap this phase didn't close — doing so needs server-side idempotency-key support (a backend change) and was out of scope for a frontend-focused reliability pass.
- **No generic client-ID → server-ID remapping** for arbitrary dependent queued mutations — the one place this matters today (order→bill on the same table) has a working bespoke solution; a delete/refund/update against a not-yet-synced record isn't supported and isn't queued (fails with a clear error instead, unchanged).
- **Update/delete offline queueing for Expense, Inventory, Cash Session close, and Attendance logout-of-a-queued-login** — scoped out per your explicit answer; these remain direct-API-only.
- **No durable review log for permanently-dropped (data-rejected) queue items** beyond the existing toast — if a cashier misses/dismisses it, the record of what was dropped and why is gone. Not built this pass to keep the change surface focused.
- **No backend-reachability health check** — `navigator.onLine` can still report "online" while the actual backend is unreachable (captive portal, local-only Wi-Fi); the 15s retry loop compensates in practice but the indicator itself can look wrong in the interim.
- **The two divergent `capacitor.config.ts` files** (§10) — a build-config observation, not resolved this phase.
- **No `@capacitor/app` lifecycle handling** — acceptable today given all durable state is in `localStorage`, but an in-progress unsaved cart (DineIn's cart before "Save," specifically) is still lost if Android kills the process mid-entry, exactly as before this phase.

## 15. Recommendations Before Pilot Restaurants

1. Reconcile the two `capacitor.config.ts` files (§10, §14) before cutting an Android build for pilot — verify which one the actual build pipeline consumes and align the other, or remove the stray one.
2. Consider a lightweight backend-idempotency-key addition (client generates a UUID per queued action, server dedupes on it) as the highest-value follow-up — it closes the one architectural gap (§14) that no frontend-only change can fully close.
3. Consider a durable "sync issues" log (even just a longer-retained localStorage array, surfaced via the existing notification dropdown) for permanently-dropped items, so a manager can reconcile at end-of-day instead of relying on catching a toast in real time.
4. Walk through an actual extended-outage rehearsal with real devices before go-live — simulate a genuine multi-hour Wi-Fi/data outage on the actual restaurant network (not just airplane mode in a dev environment) to confirm the 15s retry loop and queue behave as expected under real-world flakiness (partial signal, captive portals).
5. No blocking issues from this review — the app is safe to pilot with the fixes in this phase applied.

## 16. Overall Offline Reliability Score

**8.5 / 10** — The core offline-billing path (the scenario the brief centers on — "internet goes down mid-lunch-rush, keep billing") was already solid before this phase and is now more robust: the two concrete ways real operational data could vanish (logout wiping the queue, an expired token silently deleting it) are closed, invoice-creation parity exists between DineIn and Quick/Takeaway, and four previously-unprotected data domains (cash sessions, attendance, expenses, inventory adjustments) now survive a network blip. Deductions: the lack of end-to-end idempotency remains a genuine (if narrow) duplicate-on-resend window that only a backend change can fully close, and several lower-priority gaps (update/delete queueing, a durable drop log, backend reachability checks) are consciously deferred rather than fixed. Nothing found in this review represents an unaddressed risk of silent, unrecoverable data loss for the core billing workflow the brief is centered on.
