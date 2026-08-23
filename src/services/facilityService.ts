import { api } from "./api";
import { enqueueAction, isNetworkError } from "@/utils/offlineQueue";

/**
 * Equipment and SOP checklists — the two "the building needs something"
 * concerns a manager should be able to settle without the owner.
 *
 * Equipment matters beyond record-keeping now: a unit carries stationId and
 * itemsPerHour, which feed the station throughput ceiling behind the order
 * ETA. Marking a fryer out of service therefore has to be possible the moment
 * it breaks, not the next time the owner signs in — otherwise the ETA keeps
 * quoting capacity that doesn't exist.
 */

// ── Equipment ───────────────────────────────────────────────────────────────

export const getEquipment = async (restaurantId: number, branchId: number) => {
  const res = await api.get(`/equipment/${restaurantId}/${branchId}`);
  return res.data;
};

export const getMaintenanceDue = async (restaurantId: number, branchId: number) => {
  const res = await api.get(`/equipment/${restaurantId}/${branchId}/maintenance-due`);
  return res.data;
};

export const createEquipment = async (payload: {
  branchId: number;
  name: string;
  category?: string;
  itemCapacityCount?: number | null;
  itemsPerHour?: number | null;
  serviceProviderName?: string;
  serviceProviderContact?: string;
  nextMaintenanceDate?: string;
  maintenanceNotes?: string;
}) => {
  try {
    const res = await api.post("/equipment", payload);
    return res.data;
  } catch (err: any) {
    if (isNetworkError(err)) {
      enqueueAction("/equipment", payload, `New equipment: ${payload.name}`, "generic");
      return { success: true, queuedOffline: true };
    }
    throw err;
  }
};

/**
 * Also the breakdown log: `isActive: false` takes a unit out of service, and
 * maintenanceNotes carries what happened. Not offline-queued — the queue
 * replays POSTs only, and a PUT replayed out of order could resurrect a stale
 * state onto a row someone else has since corrected.
 */
export const updateEquipment = async (
  id: number,
  payload: Partial<{
    name: string;
    category: string;
    itemCapacityCount: number | null;
    itemsPerHour: number | null;
    serviceProviderName: string;
    serviceProviderContact: string;
    nextMaintenanceDate: string;
    maintenanceNotes: string;
    isActive: boolean;
  }>,
) => {
  const res = await api.put(`/equipment/${id}`, payload);
  return res.data;
};

// ── SOP checklists ──────────────────────────────────────────────────────────
// The sop module has had full CRUD for a while with no UI in either app.

export interface SopChecklist {
  id: number;
  restaurantId: number;
  branchId?: number | null;
  menuItemId?: number | null;
  title: string;
  /** An ARRAY of step strings, not a newline-joined blob — see createSopChecklist. */
  steps?: string[] | null;
  category?: string | null;
  createdAt: string;
}

export const getSopChecklists = async (restaurantId: number) => {
  const res = await api.get(`/sop/${restaurantId}`);
  return res.data;
};

/**
 * `steps` is `string[]`, which is what sop.service.ts writes straight to
 * Prisma — sending the textarea's raw newline-delimited string instead would
 * hand a String to a String[] column. Callers split before calling.
 *
 * There is no `description` field on SopChecklist; the steps are the content.
 */
export const createSopChecklist = async (payload: {
  restaurantId: number;
  title: string;
  steps: string[];
  category?: string;
  branchId?: number;
  menuItemId?: number | null;
}) => {
  try {
    const res = await api.post("/sop", payload);
    return res.data;
  } catch (err: any) {
    if (isNetworkError(err)) {
      enqueueAction("/sop", payload, `Checklist: ${payload.title}`, "generic");
      return { success: true, queuedOffline: true };
    }
    throw err;
  }
};

export const updateSopChecklist = async (
  id: number,
  payload: Partial<{ title: string; steps: string[]; category: string }>,
) => {
  const res = await api.put(`/sop/${id}`, payload);
  return res.data;
};

export const deleteSopChecklist = async (id: number) => {
  const res = await api.delete(`/sop/${id}`);
  return res.data;
};
