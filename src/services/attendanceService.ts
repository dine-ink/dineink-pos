import { api } from "./api";
import { enqueueAction, isNetworkError } from "@/utils/offlineQueue";

export interface AttendanceRow {
  id: number;
  name: string;
  restaurantId: number;
  branchId: number;
  attendanceId: number | null;
  status: boolean;
  loginTime: string | null;
  logoutTime: string | null;
  totalHours: number;
  /** Set locally when a clock-in/out queued offline hasn't synced yet. */
  queuedOffline?: boolean;
}

export const getTodayAttendance = async (
  branchId: number,
): Promise<{ success: boolean; data: AttendanceRow[] }> => {
  const response = await api.get(`/admin/attendance/${branchId}`);

  return response.data;
};

// Clock-in/out must never be lost to a network blip — the shift itself
// still happened. Queues locally on a genuine connectivity failure and syncs
// automatically once reconnected (see MainLayout's flush loop).
export const loginAttendance = async (data: {
  userId: number;
  restaurantId: number;
  branchId: number;
}) => {
  try {
    const response = await api.post("/admin/attendance/login", data);
    return response.data;
  } catch (err: any) {
    if (isNetworkError(err)) {
      enqueueAction("/admin/attendance/login", data, "Clock in", "generic");
      return { success: true, queuedOffline: true };
    }
    throw err;
  }
};

export const logoutAttendance = async (attendanceId: number) => {
  const data = { attendanceId };
  try {
    const response = await api.post("/admin/attendance/logout", data);
    return response.data;
  } catch (err: any) {
    if (isNetworkError(err)) {
      enqueueAction("/admin/attendance/logout", data, "Clock out", "generic");
      return { success: true, queuedOffline: true };
    }
    throw err;
  }
};
