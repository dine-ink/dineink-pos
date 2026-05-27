import { api } from "./api";

export const createRestaurantTable = async (body: any) => {
  const response = await api.post("/restaurant/restaurant-table/create", body);

  return response.data;
};

export const deleteRestaurantTable = async (id: number) => {
  const response = await api.delete(
    `/restaurant/restaurant-table/delete/${id}`,
  );

  return response.data;
};
