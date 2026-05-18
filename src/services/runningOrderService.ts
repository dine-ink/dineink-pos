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
