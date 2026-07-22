import { api } from "./api";

export const loginApi = async (identifier: string, password: string) => {
  const response = await api.post("/auth/login", {
    identifier,
    password,
  });

  return response.data;
};

// Re-fetches this staff member's own record straight from the DB — used to
// pick up a branch/role reassignment made on the owner dashboard without
// requiring a manual logout/login, since the token itself is never reissued
// mid-session.
export const getMyProfile = async () => {
  const response = await api.get("/restaurant/my-restaurant");

  return response.data;
};

// Unlocks a manual discount above the branch's approval threshold — checks
// a manager's password against any MANAGER/OWNER in this restaurant without
// swapping the cashier's own logged-in session (no new token is issued).
export const verifyManagerOverride = async (password: string) => {
  const response = await api.post("/auth/verify-manager-override", { password });
  return response.data;
};
