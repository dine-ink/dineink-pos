import { api } from "./api";

// Bulk map of menuItemId -> attached add-on groups (each with its priced
// options) — fetched once per menu load so tapping an item never needs its
// own round-trip to know whether it has add-ons.
export const getRestaurantAddOnAttachments = async (restaurantId: number) => {
  const response = await api.get(`/addons/restaurant/${restaurantId}/attachments`);
  return response.data;
};
