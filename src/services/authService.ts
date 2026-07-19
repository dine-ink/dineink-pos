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
