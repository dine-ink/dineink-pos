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
export type QueuedActionType = "order" | "bill";

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

const writeQueue = (queue: QueuedAction[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

const nextProvisionalBillNo = (): string => {
  const n = Number(localStorage.getItem(BILL_SEQ_KEY) || "0") + 1;
  localStorage.setItem(BILL_SEQ_KEY, String(n));
  return `OFFLINE-BILL-${n}`;
};

// Axios only sets `response` when the server actually replied — a genuine
// connectivity failure (no wifi/data) leaves it undefined with `request` set.
export const isNetworkError = (err: any) => !err?.response && !!err?.request;

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const enqueueAction = (url: string, body: any, description: string): QueuedAction => {
  const action: QueuedAction = {
    id: makeId(),
    type: "order",
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
}

// Shared in-flight promise — MainLayout calls this both immediately on
// reconnect and every 15s, and those two calls can genuinely overlap (a slow
// request still in flight when the next tick fires). Without this guard,
// both calls would read the same still-present queue and submit the same
// bill/order twice, minting two invoices for one sale.
let flushPromise: Promise<FlushResult> | null = null;

// Sends each queued action for real, oldest first. Stops at the first
// network failure (keeps it and everything after it queued) so retries stay
// in the order they were placed. A "bill" action that syncs successfully
// triggers an automatic reprint of the real, server-numbered invoice. An
// action the server rejects outright (not a network error — e.g. validation
// failure) is dropped and reported back rather than silently vanishing.
export const flushQueue = async (): Promise<FlushResult> => {
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    const queue = readQueue();
    let synced = 0;
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
          printReceipt({ ...rest, billNo: realBillNo } as BillData);
        }
      } catch (err: any) {
        if (isNetworkError(err)) {
          // Still offline — stop here; everything from this point on (and
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
    return { synced, remaining: remaining.length, dropped };
  })();

  try {
    return await flushPromise;
  } finally {
    flushPromise = null;
  }
};
