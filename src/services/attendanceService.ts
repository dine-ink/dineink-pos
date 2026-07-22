import { api } from "./api";

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
}

export const getTodayAttendance = async (
  branchId: number,
): Promise<{ success: boolean; data: AttendanceRow[] }> => {
  const response = await api.get(`/admin/attendance/${branchId}`);

  return response.data;
};

export const loginAttendance = async (data: {
  userId: number;
  restaurantId: number;
  branchId: number;
}) => {
  const response = await api.post("/admin/attendance/login", data);

  return response.data;
};

export const logoutAttendance = async (attendanceId: number) => {
  const response = await api.post("/admin/attendance/logout", {
    attendanceId,
  });

  return response.data;
};
