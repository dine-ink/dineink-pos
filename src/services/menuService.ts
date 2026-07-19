import { api } from "./api";

export const getMenuItems = async () => {
  const response = await api.get("/menu-items");

  return response.data;
};

// Lets kitchen staff mark a dish sold out (or back in stock) themselves —
// they know what ingredients have actually run out mid-shift, rather than
// routing through the owner dashboard.
export const setMenuItemAvailability = async (id: number, isAvailable: boolean) => {
  const response = await api.put(`/restaurant/menu-items/${id}`, { isAvailable });

  return response.data;
};
