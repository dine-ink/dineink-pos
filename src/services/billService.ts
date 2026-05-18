import { api } from "./api";

export const createBill = async (data: any) => {
  const response = await api.post("/bills/create", data);

  return response.data;
};

export const getBills = async () => {
  const response = await api.get("/bills");

  return response.data;
};
