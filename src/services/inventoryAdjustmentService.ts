import { api } from "./api";

export const getInventoryAdjustments = async (branchId: number) => {
  const response = await api.get(`/admin/inventory/${branchId}`);

  return response.data;
};

export const getInventoryIngredients = async (restaurantId: number) => {
  const response = await api.get(
    `/admin/inventory/ingredients/${restaurantId}`,
  );

  return response.data;
};

export const getInventoryUsers = async (branchId: number) => {
  const response = await api.get(`/admin/inventory/users/${branchId}`);

  return response.data;
};

export const createInventoryAdjustment = async (data: {
  restaurantId: number;
  branchId: number;

  ingredientId: number;

  quantity: number;

  adjustmentType: string;

  reason?: string;

  updatedById?: number;
}) => {
  const response = await api.post("/admin/inventory", data);

  return response.data;
};

export const updateInventoryAdjustment = async (
  id: number,
  data: {
    ingredientId: number;

    quantity: number;

    adjustmentType: string;

    reason?: string;

    updatedById?: number;
  },
) => {
  const response = await api.put(`/admin/inventory/${id}`, data);

  return response.data;
};

export const deleteInventoryAdjustment = async (id: number) => {
  const response = await api.delete(`/admin/inventory/${id}`);

  return response.data;
};
