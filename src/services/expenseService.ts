import { api } from "./api";

export const getExpenses = async (branchId: number) => {
  const response = await api.get(`/admin/expenses/${branchId}`);

  return response.data;
};

export const getExpenseUsers = async (branchId: number) => {
  const response = await api.get(`/admin/expenses/users/${branchId}`);

  return response.data;
};

export const createExpense = async (data: {
  restaurantId: number;
  branchId: number;
  title: string;
  description?: string;
  amount: number;
  expenseType?: string;
  paymentSource: string;
  paidByUserId?: number | null;
  expenseDate: string;
  createdById?: number;
}) => {
  const response = await api.post("/admin/expenses", data);

  return response.data;
};

export const updateExpense = async (
  id: number,
  data: {
    title: string;
    description?: string;
    amount: number;
    expenseType?: string;
    paymentSource: string;
    paidByUserId?: number | null;
    expenseDate: string;
  },
) => {
  const response = await api.put(`/admin/expenses/${id}`, data);

  return response.data;
};

export const deleteExpense = async (id: number) => {
  const response = await api.delete(`/admin/expenses/${id}`);

  return response.data;
};
