import { api } from "./api";

// Checkout-time lookup — surfaces "returning customer, N visits" as soon as
// a phone number is typed, instead of every guest starting from a blank slate.
export const lookupCustomerByPhone = async (restaurantId: number, phone: string) => {
  const response = await api.get(`/customers/${restaurantId}/lookup`, {
    params: { phone },
  });
  return response.data;
};
