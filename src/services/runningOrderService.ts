import { api } from "./api";

export const saveRunningOrder = async (data: any) => {
  const response = await api.post("/running-orders/saveRunningOrder", data);

  return response.data;
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
