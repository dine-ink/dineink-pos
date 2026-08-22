import toast from "react-hot-toast";
import { api } from "@/services/api";
import { printReceipt, type BillData } from "@/utils/printer";

// Offline queue for two write paths that must never be lost to a network
// blip: placing a dine-in/takeaway KOT ("order"), and generating a bill
// ("bill"). Both queue locally on a genuine connectivity failure and sync
// automatically once the connection returns (see MainLayout's flush loop).
//
// "bill" actions carry a full receipt snapshot (billMeta) so a provisional
// receipt can print immediately with a local placeholder number, and the
// REAL invoice — with the actual sequential GST number the server assigns
// once this syncs — prints automatically right after a successful sync.
//
// "generic" covers other create-only actions worth protecting the same way
// (cash session open, attendance login/logout, expense/inventory create) —
// no special post-sync side effect, just a plain POST replay.
export type QueuedActionType = "order" | "bill" | "generic";

export interface QueuedBillMeta extends Omit<BillData, "billNo"> {
  provisionalBillNo: string;
}

export interface QueuedAction {
  id: string;
  type: QueuedActionType;
  url: string;
  body: any;
  description: string;
  createdAt: string;
  billMeta?: QueuedBillMeta;
}

const STORAGE_KEY = "dineink_offline_queue";
const BILL_SEQ_KEY = "dineink_offline_bill_seq";

const readQueue = (): QueuedAction[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

// Storage can fail (quota exceeded, corrupted device storage) — this must
// never throw past its callers, since a throw here would defeat the very
// fallback the offline queue exists to provide (an offline order/bill would
// crash instead of queueing). Callers get a boolean back instead so they can
// surface a clear message when persistence genuinely can't happen.
const writeQueue = (queue: QueuedAction[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    toast.error("Couldn't save this offline — device storage is full. Please sync now or free up space.", { duration: 8000 });
    return false;
  }
};

const nextProvisionalBillNo = (): string => {
  const n = Number(localStorage.getItem(BILL_SEQ_KEY) || "0") + 1;
  localStorage.setItem(BILL_SEQ_KEY, String(n));
  return `OFFLINE-BILL-${n}`;
};

// Axios only sets `response` when the server actually replied — a genuine
// connectivity failure (no wifi/data) leaves it undefined with `request` set.
export const isNetworkError = (err: any) => !err?.response && !!err?.request;

// Errors worth keeping queued for a later retry rather than dropping outright:
// a real connectivity failure, an expired/invalid token (401 — the session
// will be renewed, not the data rejected), or a transient backend problem
// (5xx). Anything else with a response (400/403/404/409/422 etc.) means the
// server looked at this specific data and rejected it — retrying the same
// body will never succeed, so those still get dropped-and-reported.
export const isRetryableError = (err: any) =>
  isNetworkError(err) || err?.response?.status === 401 || err?.response?.status >= 500;

// Collision-resistant local ID (timestamp + random suffix) — exported for
// reuse anywhere else a client-side-only ID is needed (e.g. a held-order
// draft) instead of a bare `Date.now()`, which two actions in the same
// millisecond could collide on.
export const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const enqueueAction = (
  url: string,
  body: any,
  description: string,
  type: Exclude<QueuedActionType, "bill"> = "order",
): QueuedAction => {
  const action: QueuedAction = {
    id: makeId(),
    type,
    url,
    body,
    description,
    createdAt: new Date().toISOString(),
  };
  writeQueue([...readQueue(), action]);
  return action;
};

// Returns the created action (its billMeta.provisionalBillNo is what to
// print immediately) so the caller doesn't need to re-derive it.
export const enqueueBillAction = (
  url: string,
  body: any,
  billMeta: Omit<BillData, "billNo">,
  description: string,
): QueuedAction => {
  const provisionalBillNo = nextProvisionalBillNo();
  const action: QueuedAction = {
    id: makeId(),
    type: "bill",
    url,
    body,
    description,
    createdAt: new Date().toISOString(),
    billMeta: { ...billMeta, provisionalBillNo },
  };
  writeQueue([...readQueue(), action]);
  return action;
};

export const getQueuedActions = readQueue;

export const getQueueCount = (): number => readQueue().length;

// Items from any not-yet-synced KOT placements for this table — needed when
// billing happens while STILL offline, so a bill built right after an
// offline order-save doesn't miss the very items that order just added
// (tableOrders only reflects server-confirmed data, which a queued-not-yet-
// synced order isn't).
export const getQueuedItemsForTable = (tableId: number): any[] =>
  readQueue()
    .filter((a) => a.type === "order" && a.body?.tableId === tableId)
    .flatMap((a) => a.body?.items || []);

// Called after successfully billing a table (online or queued) — removes
// any of that table's still-queued KOT placements, since their items are
// now already folded into the bill. Without this, those entries would sync
// later as a phantom, never-billed RunningOrder duplicating what the bill
// already covers.
export const removeQueuedOrdersForTable = (tableId: number) => {
  writeQueue(readQueue().filter((a) => !(a.type === "order" && a.body?.tableId === tableId)));
};

export interface DroppedAction {
  description: string;
  reason: string;
}

export interface FlushResult {
  synced: number;
  remaining: number;
  dropped: DroppedAction[];
  authExpired: boolean;
}

// Shared in-flight promise — MainLayout calls this both immediately on
// reconnect and every 15s, and those two calls can genuinely overlap (a slow
// request still in flight when the next tick fires). Without this guard,
// both calls would read the same still-present queue and submit the same
// bill/order twice, minting two invoices for one sale.
let flushPromise: Promise<FlushResult> | null = null;

// Sends each queued action for real, oldest first. Stops at the first
// retryable failure (keeps it and everything after it queued) so retries
// stay in the order they were placed. A "bill" action that syncs
// successfully triggers an automatic reprint of the real, server-numbered
// invoice. An action the server rejects outright (a genuine data problem —
// not connectivity, not an expired token, not a transient backend error) is
// dropped and reported back rather than silently vanishing.
export const flushQueue = async (): Promise<FlushResult> => {
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    const queue = readQueue();
    let synced = 0;
    let authExpired = false;
    const succeededIds = new Set<string>();
    const droppedIds = new Set<string>();
    const dropped: DroppedAction[] = [];

    for (const action of queue) {
      try {
        const res = await api.post(action.url, action.body);
        synced++;
        succeededIds.add(action.id);

        if (action.type === "bill" && action.billMeta) {
          const realBillNo: string =
            res.data?.bill?.billNo || res.data?.data?.billNo || action.billMeta.provisionalBillNo;
          const { provisionalBillNo, ...rest } = action.billMeta;
          const printed = await printReceipt({ ...rest, billNo: realBillNo } as BillData);
          if (!printed) {
            toast.error(`Bill ${realBillNo} synced, but the receipt didn't print — please reprint it manually.`, { duration: 8000 });
          }
        }
      } catch (err: any) {
        if (err?.response?.status === 401) {
          // Session expired/invalid mid-sync — this is NOT the data's fault,
          // so never drop it. Stop here (same as a network failure) and let
          // the caller know a re-login is needed to resume syncing.
          authExpired = true;
          break;
        }
        if (isRetryableError(err)) {
          // Still offline, or the backend itself is having a transient
          // problem (5xx) — stop here; everything from this point on (and
          // anything queued elsewhere meanwhile) stays queued for next time.
          break;
        }
        // Server rejected it outright (e.g. table no longer exists) — this
        // will never succeed by retrying. Drop it, but tell the caller why.
        droppedIds.add(action.id);
        dropped.push({
          description: action.description,
          reason: err?.response?.data?.message || "Rejected by the server",
        });
      }
    }

    // Re-read current storage rather than reusing the snapshot from the
    // start of this run — the user may have queued a new action while this
    // flush was in progress, and blindly overwriting would silently drop it.
    const remaining = readQueue().filter(
      (a) => !succeededIds.has(a.id) && !droppedIds.has(a.id),
    );
    writeQueue(remaining);
    return { synced, remaining: remaining.length, dropped, authExpired };
  })();

  try {
    return await flushPromise;
  } finally {
    flushPromise = null;
  }
};
