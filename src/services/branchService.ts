import { api } from "./api";

export const getBranchDetails = async (branchId: number) => {
  const response = await api.get(`/restaurant/branch/${branchId}`);

  return response.data;
};
