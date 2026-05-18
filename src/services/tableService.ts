import { api } from "./api";

export const getTables = async (restaurantId: number, branchId: number) => {
  const response = await api.get(
    `/restaurant/table/${restaurantId}/${branchId}`,
  );

  return response.data;
};
