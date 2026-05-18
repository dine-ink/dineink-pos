import { api } from "./api";

export const getMenuItems = async () => {
  const response = await api.get("/menu-items");

  return response.data;
};
