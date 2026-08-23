import { api } from "./api";

/**
 * Day-scoped menu edits from the floor: a price correction, or a today-only
 * special. Previously any change beyond the kitchen's sold-out toggle needed
 * owner-web.
 *
 * Guarded in the UI by verifyManagerOverride (the same manager-password prompt
 * already used for discount approval) rather than by role alone. The backend
 * route is only auth-gated, so the override is what actually stands between a
 * cashier and the price list — worth being explicit about, because a mistake
 * here is silently mispriced revenue rather than a visible error.
 */

export const updateMenuItem = async (
  id: number,
  payload: Partial<{
    name: string;
    price: number;
    isAvailable: boolean;
    prepTime: number;
    description: string;
  }>,
) => {
  const res = await api.put(`/restaurant/menu-items/${id}`, payload);
  return res.data;
};

export const getMenuManagement = async (restaurantId: number) => {
  const res = await api.get(`/inventory/${restaurantId}/menu-management`);
  return res.data;
};
