import { api } from "./api";
import { enqueueAction, isNetworkError } from "@/utils/offlineQueue";

export const getCashSessions = async (branchId: number) => {
  const response = await api.get(`/cash/sessions?branchId=${branchId}`);
  return response.data;
};

// Opening the drawer is the one cash-session action worth protecting from a
// network blip — a cashier must be able to start their shift and take cash
// even if the connection is down at that exact moment. Queues locally on a
// genuine connectivity failure and syncs automatically once reconnected (see
// MainLayout's flush loop), same pattern as saveRunningOrder.
export const openCashSession = async (data: {
  branchId: number;
  restaurantId: number;
  openedById: number;
  openingCash: number;
  businessDate?: string;
  notes?: string;
}) => {
  try {
    const response = await api.post("/cash/open", data);
    return response.data;
  } catch (err: any) {
    if (isNetworkError(err)) {
      enqueueAction("/cash/open", data, "Open cash session", "generic");
      return { success: true, queuedOffline: true };
    }
    throw err;
  }
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
