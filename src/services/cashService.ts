import { api } from "./api";

export const getCashSessions = async (branchId: number) => {
  const response = await api.get(`/cash/sessions?branchId=${branchId}`);
  return response.data;
};

export const openCashSession = async (data: {
  branchId: number;
  restaurantId: number;
  openedById: number;
  openingCash: number;
  businessDate?: string;
  notes?: string;
}) => {
  const response = await api.post("/cash/open", data);
  return response.data;
};

export const closeCashSession = async (
  sessionId: number,
  data: {
    closedById: number;
    actualCash: number;
    closingCash: number;
    notes?: string;
  },
) => {
  const response = await api.put(`/cash/close/${sessionId}`, data);
  return response.data;
};
