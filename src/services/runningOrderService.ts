import { api } from "./api";

export const saveRunningOrder = async (data: any) => {
  const response = await api.post("/running-orders/saveRunningOrder", data);

  return response.data;
};

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
