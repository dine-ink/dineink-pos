import { api } from "./api";

/**
 * Kitchen stations, per-item labor standards, and the live queue that powers
 * the order-taking ETA.
 *
 * Every route here except `getKitchenQueue` is OWNER/MANAGER gated. The queue
 * read is deliberately open to any signed-in staff member because the caller
 * is a cashier or captain quoting a wait — see the comment above the route in
 * labor.routes.ts for why that's safe (no salary, no per-employee row).
 */

export interface QueueStation {
  stationId: number;
  code: string;
  name: string;
  queueMinutes: number;
  queueItems: number;
  skilledStaffPresent: number;
  lanes: number;
  capacityPerHour: number | null;
  laborWaitMinutes: number;
  equipmentWaitMinutes: number;
  waitMinutes: number;
  isEquipmentBound: boolean;
  /** lanes × utilization — hands-on minutes ÷ this = elapsed minutes. */
  productiveDivisor: number;
}

export interface KitchenQueue {
  configured: boolean;
  reason?: string;
  targetTicketMinutes: number;
  openOrders: number;
  staffDataAvailable: boolean;
  unpricedQueueItems?: number;
  stations: QueueStation[];
  standards: Record<number, { stationId: number; minutes: number }[]>;
  /** menuItemId → whole-dish prepTime. Used as a floor; see useKitchenQueue. */
  wholeItemMinutes: Record<number, number>;
}

export const getKitchenQueue = async (restaurantId: number, branchId: number) => {
  const res = await api.get(`/labor/${restaurantId}/${branchId}/kitchen-queue`);
  return res.data as { success: boolean; data: KitchenQueue };
};

// ── Stations ────────────────────────────────────────────────────────────────

export const getStations = async (restaurantId: number, branchId: number, includeInactive = false) => {
  const res = await api.get(
    `/labor/${restaurantId}/${branchId}/stations?includeInactive=${includeInactive}`,
  );
  return res.data;
};

export const createStation = async (payload: {
  branchId: number;
  name: string;
  code: string;
  utilizationFactor?: number | null;
  capacityPerHour?: number | null;
  sortOrder?: number;
}) => {
  const res = await api.post("/labor/stations", payload);
  return res.data;
};

export const updateStation = async (
  stationId: number,
  payload: Partial<{
    name: string;
    utilizationFactor: number | null;
    capacityPerHour: number | null;
    sortOrder: number;
    isActive: boolean;
  }>,
) => {
  const res = await api.put(`/labor/stations/${stationId}`, payload);
  return res.data;
};

export const deleteStation = async (stationId: number) => {
  const res = await api.delete(`/labor/stations/${stationId}`);
  return res.data;
};

/** Creates the conventional station set (GRILL, FRYER, PREP, …) in one call. */
export const seedStations = async (branchId: number) => {
  const res = await api.post("/labor/stations/seed", { branchId });
  return res.data;
};

/** Points a piece of equipment at a station and records its items/hour throughput. */
export const assignEquipmentToStation = async (
  equipmentId: number,
  payload: { stationId: number | null; itemsPerHour: number | null },
) => {
  const res = await api.put(`/labor/equipment/${equipmentId}/station`, payload);
  return res.data;
};

// ── Labor standards ─────────────────────────────────────────────────────────

export const getLaborStandards = async (restaurantId: number, branchId: number) => {
  const res = await api.get(`/labor/${restaurantId}/${branchId}/standards`);
  return res.data;
};

export const upsertLaborStandard = async (payload: {
  menuItemId: number;
  stationId: number;
  standardMinutes: number;
}) => {
  const res = await api.post("/labor/standards", payload);
  return res.data;
};

export const deleteLaborStandard = async (menuItemId: number, stationId: number) => {
  const res = await api.delete(`/labor/standards/${menuItemId}/${stationId}`);
  return res.data;
};

/**
 * Splits every menu item's existing whole-item prepTime across stations by
 * weight, so the standards table can be populated in one action instead of
 * hand-entering a row per item per station. The result is an estimate to
 * correct, not a substitute for real measurement — but it's what makes the ETA
 * feature reachable on day one.
 */
export const seedStandardsFromPrepTime = async (payload: {
  branchId: number;
  weights: { stationId: number; weight: number }[];
  /** Must be `overwriteExisting` on the wire — the controller reads that exact key. */
  overwriteExisting?: boolean;
}) => {
  const res = await api.post("/labor/standards/seed-from-prep-time", payload);
  return res.data;
};

// ── Skills ──────────────────────────────────────────────────────────────────

export const getSkillMatrix = async (restaurantId: number, branchId: number) => {
  const res = await api.get(`/labor/${restaurantId}/${branchId}/skills`);
  return res.data;
};

export const upsertSkill = async (payload: {
  userId: number;
  stationId: number;
  proficiency?: number;
  speedFactor?: number;
}) => {
  const res = await api.post("/labor/skills", payload);
  return res.data;
};

export const deleteSkill = async (userId: number, stationId: number) => {
  const res = await api.delete(`/labor/skills/${userId}/${stationId}`);
  return res.data;
};
