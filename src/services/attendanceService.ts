import { api } from "./api";

export const getTodayAttendance = async (branchId: number) => {
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

export const startBreak = async (attendanceId: number) => {
  const response = await api.post("/admin/attendance/start-break", {
    attendanceId,
  });

  return response.data;
};

export const endBreak = async (attendanceId: number) => {
  const response = await api.post("/admin/attendance/end-break", {
    attendanceId,
  });

  return response.data;
};
