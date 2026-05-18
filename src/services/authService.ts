import { api } from "./api";

export const loginApi = async (identifier: string, password: string) => {
  const response = await api.post("/auth/login", {
    identifier,
    password,
  });

  return response.data;
};
