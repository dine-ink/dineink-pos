import { api } from "./api";
import { enqueueAction, isNetworkError } from "@/utils/offlineQueue";

export const getExpenses = async (branchId: number) => {
  const response = await api.get(`/admin/expenses/${branchId}`);

  return response.data;
};

export const getExpenseUsers = async (branchId: number) => {
  const response = await api.get(`/admin/expenses/users/${branchId}`);

  return response.data;
};

// Logging an expense must never be lost to a network blip. Queues locally
// on a genuine connectivity failure and syncs automatically once reconnected
// (see MainLayout's flush loop).
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
  try {
    const response = await api.post("/admin/expenses", data);
    return response.data;
  } catch (err: any) {
    if (isNetworkError(err)) {
      enqueueAction("/admin/expenses", data, `Expense: ${data.title}`, "generic");
      return { success: true, queuedOffline: true };
    }
    throw err;
  }
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
