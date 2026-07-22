import { api } from "./api";

// Checkout-time only — validates a code and returns the discount it would
// apply, without consuming a use. The use itself is only counted when the
// bill is actually created (see closeRunningOrder/createBill), so an applied
// code that's abandoned mid-checkout never burns a redemption.
export const validateDiscountCode = async (code: string, subtotal: number) => {
  const response = await api.post("/discounts/validate", { code, subtotal });
  return response.data;
};

// Owner-web management — list/create/update/delete discount codes.
export const getDiscountCodes = async (restaurantId: number) => {
  const response = await api.get(`/discounts/${restaurantId}`);
  return response.data;
};

export const createDiscountCode = async (data: {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  maxUses?: number | null;
  expiresAt?: string | null;
}) => {
  const response = await api.post("/discounts", data);
  return response.data;
};

export const updateDiscountCode = async (id: number, data: any) => {
  const response = await api.put(`/discounts/${id}`, data);
  return response.data;
};

export const deleteDiscountCode = async (id: number) => {
  const response = await api.delete(`/discounts/${id}`);
  return response.data;
};
