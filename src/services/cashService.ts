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

// Revenue/bill-count/payment breakdown for THIS session's own open→now
// window (not the whole day — see cash.service.ts), shown to the cashier
// alongside the cash reconciliation when closing their session.
export const getShiftSalesSummary = async (sessionId: number) => {
  const response = await api.get(`/cash/shift-summary/session/${sessionId}`);
  return response.data;
};
