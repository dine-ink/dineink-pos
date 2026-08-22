import { api } from "./api";
import { enqueueAction, isNetworkError } from "@/utils/offlineQueue";

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

// Recording a stock adjustment must never be lost to a network blip. Queues
// locally on a genuine connectivity failure and syncs automatically once
// reconnected (see MainLayout's flush loop).
export const createInventoryAdjustment = async (data: {
  restaurantId: number;
  branchId: number;

  ingredientId: number;

  quantity: number;

  adjustmentType: string;

  reason?: string;

  updatedById?: number;
}) => {
  try {
    const response = await api.post("/admin/inventory", data);
    return response.data;
  } catch (err: any) {
    if (isNetworkError(err)) {
      enqueueAction("/admin/inventory", data, "Inventory adjustment", "generic");
      return { success: true, queuedOffline: true };
    }
    throw err;
  }
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
