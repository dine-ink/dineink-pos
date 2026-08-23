import { api } from "./api";
import { enqueueAction, isNetworkError } from "@/utils/offlineQueue";

/**
 * Team admin the manager can now finish on the floor: correcting a missed
 * clock-out, recording leave, and adding a new joiner.
 *
 * All three are manager-mediated by design. Most staff have no login of their
 * own (User.hasLogin defaults false), so there is no self-service half to any
 * of these flows — an employee tells the manager, and the manager records it.
 */

// ── Manual attendance correction ────────────────────────────────────────────
// OWNER/MANAGER only (requireRole on POST /attendance/manual). Queued offline
// because the most common trigger is discovering at closing time that someone
// forgot to clock out hours ago.

export const correctAttendance = async (payload: {
  userId: number;
  restaurantId: number;
  branchId: number;
  date: string;
  manualTotalHours?: number | null;
  overtimeHours?: number | null;
  status?: string | null;
}) => {
  try {
    const res = await api.post("/attendance/manual", payload);
    return res.data;
  } catch (err: any) {
    if (isNetworkError(err)) {
      enqueueAction(
        "/attendance/manual",
        payload,
        `Attendance correction for staff #${payload.userId} on ${payload.date}`,
        "generic",
      );
      return { success: true, queuedOffline: true };
    }
    throw err;
  }
};

export const getMonthlyAttendance = async (branchId: number, from: string, to: string) => {
  const res = await api.get(`/attendance/branch/${branchId}/monthly?from=${from}&to=${to}`);
  return res.data;
};

// ── Leave ───────────────────────────────────────────────────────────────────

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export const getLeaveRequests = async (restaurantId: number, branchId: number, status?: LeaveStatus) => {
  const qs = status ? `?status=${status}` : "";
  const res = await api.get(`/attendance/leave/${restaurantId}/${branchId}${qs}`);
  return res.data;
};

/**
 * Records leave. `status: "APPROVED"` lands a settled row in one call — the
 * manager IS the approver, so a create-then-PATCH pair would only add a window
 * where a failure leaves the leave stuck PENDING with no queue watching it.
 * The backend gates a non-PENDING status to OWNER/MANAGER.
 */
export const recordLeave = async (payload: {
  userId: number;
  branchId: number;
  leaveType?: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status?: LeaveStatus;
}) => {
  try {
    const res = await api.post("/attendance/leave", payload);
    return res.data;
  } catch (err: any) {
    if (isNetworkError(err)) {
      enqueueAction(
        "/attendance/leave",
        payload,
        `Leave for staff #${payload.userId} (${payload.startDate} → ${payload.endDate})`,
        "generic",
      );
      return { success: true, queuedOffline: true };
    }
    throw err;
  }
};

export const setLeaveStatus = async (id: number, status: "APPROVED" | "REJECTED") => {
  const res = await api.patch(`/attendance/leave/${id}/status`, { status });
  return res.data;
};

export const deleteLeave = async (id: number) => {
  const res = await api.delete(`/attendance/leave/${id}`);
  return res.data;
};

// ── Staff ───────────────────────────────────────────────────────────────────

export const getStaff = async (restaurantId: number, branchId: number) => {
  const res = await api.get(`/restaurant/staff/${restaurantId}/${branchId}`);
  return res.data;
};

/**
 * Adds a joiner. `salary` is deliberately absent from this payload: the POS is
 * a shared, often-unattended device, and pay is the one field on a staff
 * record that must not be readable or writable from the floor. It stays an
 * owner-web action, and the backend leaves the column null here.
 *
 * hasLogin defaults false — the normal case, since most staff never sign in.
 */
export const createStaff = async (payload: {
  name: string;
  phone?: string;
  email?: string;
  role?: string;
  department?: string;
  shift?: string;
  joiningDate?: string;
  branchId: number;
  hasLogin?: boolean;
  password?: string;
}) => {
  const res = await api.post("/restaurant/staff/create", payload);
  return res.data;
};

export const updateStaff = async (
  id: number,
  payload: Partial<{
    name: string;
    phone: string;
    email: string;
    role: string;
    department: string;
    shift: string;
    branchId: number;
    isActive: boolean;
  }>,
) => {
  const res = await api.put(`/restaurant/staff/${id}`, payload);
  return res.data;
};
