import { api } from "./api";
import { enqueueAction, isNetworkError } from "@/utils/offlineQueue";

// The one write worth protecting from a network blip: a captured KOT the
// kitchen is waiting on. On a genuine connectivity failure this queues
// locally instead of throwing, so the cashier can keep taking orders — it
// syncs automatically once the connection returns (see MainLayout's flush).
//
// Safe to queue for every order type: this call only ever creates a
// RunningOrder (kitchen ticket), never a Bill/invoice — even for takeaway,
// where it also captures payment-method fields directly onto the
// RunningOrder, the actual invoiced Bill row is created later via
// closeRunningOrder (see OrdersPage's "Complete" action), which is where
// real invoice numbering is at stake, not here.
export const saveRunningOrder = async (data: any) => {
  try {
    const response = await api.post("/running-orders/saveRunningOrder", data);
    return response.data;
  } catch (err: any) {
    if (isNetworkError(err)) {
      enqueueAction(
        "/running-orders/saveRunningOrder",
        data,
        `Order for table ${data.tableId ?? "-"} (${(data.items || []).length} item(s))`,
      );
      return { success: true, queuedOffline: true };
    }
    throw err;
  }
};

// Returns array — each order placement for this table is a separate RunningOrder
export const getRunningOrderByTable = async (tableId: number) => {
  const response = await api.get(
    `/running-orders/${tableId}/runningOrdertable`,
  );
  return response.data;
};

export const closeRunningOrder = async (data: any) => {
  const response = await api.post("/running-orders/closeRunningOrder", data);

  return response.data;
};

export const getAllRunningOrders = async (
  restaurantId: number,
  branchId: number,
) => {
  const response = await api.get(
    `/running-orders/${restaurantId}/${branchId}/allRunningOrders`,
  );

  return response.data;
};

export const updateRunningOrderStatus = async (
  orderId: number,
  status: string,
) => {
  const response = await api.patch(
    `/running-orders/${orderId}/updateStatus`,
    { status },
  );
  return response.data;
};

export const requestItemCancel = async (itemId: number) => {
  const response = await api.patch(`/running-orders/items/${itemId}/request-cancel`);
  return response.data;
};

export const approveItemCancel = async (itemId: number) => {
  const response = await api.patch(`/running-orders/items/${itemId}/approve-cancel`);
  return response.data;
};

export const rejectItemCancel = async (itemId: number) => {
  const response = await api.patch(`/running-orders/items/${itemId}/reject-cancel`);
  return response.data;
};

export const holdRunningOrder = async (orderId: number) => {
  const response = await api.patch(`/running-orders/${orderId}/hold`);
  return response.data;
};

export const resumeRunningOrder = async (orderId: number) => {
  const response = await api.patch(`/running-orders/${orderId}/resume`);
  return response.data;
};

export const discardRunningOrder = async (orderId: number) => {
  const response = await api.delete(`/running-orders/${orderId}/discard`);
  return response.data;
};

export const cancelBill = async (billId: number) => {
  const response = await api.patch(`/bills/${billId}/cancel`);
  return response.data;
};

export const refundBill = async (
  billId: number,
  data: { amount: number; reason?: string; createdById?: number },
) => {
  const response = await api.post(`/bills/${billId}/refund`, data);
  return response.data;
};

export const transferTable = async (data: {
  fromTableId: number;
  toTableId: number;
  restaurantId: number;
  branchId: number;
}) => {
  const response = await api.post("/running-orders/transferTable", data);
  return response.data;
};
