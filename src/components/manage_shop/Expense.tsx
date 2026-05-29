import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Save, Trash2 } from "lucide-react";

import { useAppSelector } from "@/store/hooks";

import {
  createExpense,
  deleteExpense,
  getExpenses,
  getExpenseUsers,
  updateExpense,
} from "@/services/expenseService";

type ExpenseType = {
  id: number;

  restaurantId: number;
  branchId: number;

  title: string;
  description: string | null;

  amount: number;

  expenseType: string | null;

  paymentSource: string;

  paidByUserId: number | null;

  expenseDate: string;

  isNew?: boolean;

  paidByUser?: {
    id: number;
    name: string;
  } | null;
};

type UserType = {
  id: number;
  name: string;
};

const todayDate = new Date().toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export default function Expense() {
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);

  const [users, setUsers] = useState<UserType[]>([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [editRowId, setEditRowId] = useState<number | null>(null);

  const { restaurant, branch, user } = useAppSelector((state) => state.auth);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(
      (expense) =>
        expense.title?.toLowerCase().includes(search.toLowerCase()) ||
        expense.description?.toLowerCase().includes(search.toLowerCase()) ||
        expense.expenseType?.toLowerCase().includes(search.toLowerCase()) ||
        expense.paidByUser?.name?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [expenses, search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expenseRes, usersRes] = await Promise.all([
        getExpenses(branch),
        getExpenseUsers(branch),
      ]);

      console.log("Expense API", expenseRes);
      console.log("Users API", usersRes);
      setExpenses(expenseRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (id: number, field: keyof ExpenseType, value: any) => {
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id
          ? {
              ...expense,
              [field]: value,
            }
          : expense,
      ),
    );
  };

  const handleAddExpense = () => {
    const newExpense: ExpenseType = {
      id: Date.now(),

      restaurantId: restaurant,

      branchId: branch,

      title: "",

      description: "",

      amount: 0,

      expenseType: "",

      paymentSource: "SHOP_CASH",

      paidByUserId: null,

      expenseDate: new Date().toISOString(),

      isNew: true,
    };

    setExpenses((prev) => [newExpense, ...prev]);

    setEditRowId(newExpense.id);
  };

  const handleSave = async (expense: ExpenseType) => {
    try {
      if (expense.isNew) {
        await createExpense({
          restaurantId: restaurant,

          branchId: branch,

          title: expense.title,

          description: expense.description || "",

          amount: Number(expense.amount || 0),

          expenseType: expense.expenseType || "",

          paymentSource: expense.paymentSource,

          paidByUserId:
            expense.paymentSource === "EMPLOYEE_PAID"
              ? expense.paidByUserId
              : null,

          expenseDate: expense.expenseDate,

          createdById: user.id,
        });
      } else {
        await updateExpense(expense.id, {
          title: expense.title,

          description: expense.description || "",

          amount: Number(expense.amount || 0),

          expenseType: expense.expenseType || "",

          paymentSource: expense.paymentSource,

          paidByUserId:
            expense.paymentSource === "EMPLOYEE_PAID"
              ? expense.paidByUserId
              : null,

          expenseDate: expense.expenseDate,
        });
      }

      setEditRowId(null);

      await fetchData();
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async (expenseId: number) => {
    try {
      const confirmDelete = window.confirm("Delete this expense?");

      if (!confirmDelete) {
        return;
      }

      await deleteExpense(expenseId);

      await fetchData();
    } catch (error) {
      console.log(error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (amount: number) => {
    return `₹ ${Number(amount || 0).toLocaleString("en-IN")}`;
  };
  return (
    <div className="w-full h-screen bg-gray-50 p-2">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm h-[95vh] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="p-5 border-b border-gray-100 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Expense Details - {todayDate}
              </h1>

              <p className="text-gray-500 mt-2 text-sm">
                Manage all shop expense transactions.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
              <div className="relative w-full md:w-[320px]">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search expense..."
                  className="w-full h-10 rounded-xl border border-gray-200 pl-12 pr-4 outline-none focus:border-red-500"
                />
              </div>

              <button
                onClick={handleAddExpense}
                className="h-10 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={18} />
                Add Expense
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-5 pt-0 min-h-0">
          <div className="w-full h-full overflow-y-scroll overflow-x-scroll rounded-xl border border-gray-100">
            <table className="min-w-[1200px] w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr className="bg-gray-50 text-left">
                  <th className="p-4 text-sm font-bold">Date</th>

                  <th className="p-4 text-sm font-bold">Title</th>

                  <th className="p-4 text-sm font-bold">Description</th>

                  <th className="p-4 text-sm font-bold">Expense Type</th>

                  <th className="p-4 text-sm font-bold">Payment Source</th>

                  <th className="p-4 text-sm font-bold">Paid By</th>

                  <th className="p-4 text-sm font-bold">Amount</th>

                  <th className="p-4 text-sm font-bold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredExpenses.map((expense) => {
                  const isEditing = editRowId === expense.id;

                  return (
                    <tr
                      key={expense.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-all"
                    >
                      <td className="p-4 text-sm whitespace-nowrap">
                        {formatDate(expense.expenseDate)}
                      </td>

                      <td className="p-4">
                        {isEditing ? (
                          <input
                            value={expense.title}
                            onChange={(e) =>
                              handleChange(expense.id, "title", e.target.value)
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none"
                          />
                        ) : (
                          expense.title
                        )}
                      </td>

                      <td className="p-4">
                        {isEditing ? (
                          <input
                            value={expense.description || ""}
                            onChange={(e) =>
                              handleChange(
                                expense.id,
                                "description",
                                e.target.value,
                              )
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none"
                          />
                        ) : (
                          expense.description || "-"
                        )}
                      </td>

                      <td className="p-4">
                        {isEditing ? (
                          <input
                            value={expense.expenseType || ""}
                            onChange={(e) =>
                              handleChange(
                                expense.id,
                                "expenseType",
                                e.target.value,
                              )
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none"
                          />
                        ) : (
                          expense.expenseType || "-"
                        )}
                      </td>

                      <td className="p-4">
                        {isEditing ? (
                          <select
                            value={expense.paymentSource}
                            onChange={(e) =>
                              handleChange(
                                expense.id,
                                "paymentSource",
                                e.target.value,
                              )
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none"
                          >
                            <option value="SHOP_CASH">Shop Cash</option>

                            <option value="EMPLOYEE_PAID">Employee Paid</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded-lg text-xs font-medium ${
                              expense.paymentSource === "SHOP_CASH"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {expense.paymentSource === "SHOP_CASH"
                              ? "Shop Cash"
                              : "Employee Paid"}
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {isEditing ? (
                          expense.paymentSource === "EMPLOYEE_PAID" ? (
                            <select
                              value={expense.paidByUserId || ""}
                              onChange={(e) =>
                                handleChange(
                                  expense.id,
                                  "paidByUserId",
                                  Number(e.target.value),
                                )
                              }
                              className="border rounded-lg px-2 py-1 w-full outline-none"
                            >
                              <option value="">Select Employee</option>

                              {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span>Shop</span>
                          )
                        ) : expense.paymentSource === "SHOP_CASH" ? (
                          "Shop"
                        ) : (
                          expense.paidByUser?.name || "-"
                        )}
                      </td>

                      <td className="p-4 text-red-600 font-medium">
                        {isEditing ? (
                          <input
                            type="number"
                            value={expense.amount}
                            onChange={(e) =>
                              handleChange(
                                expense.id,
                                "amount",
                                Number(e.target.value),
                              )
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none"
                          />
                        ) : (
                          formatAmount(expense.amount)
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <button
                              onClick={() => handleSave(expense)}
                              className="h-9 px-3 rounded-xl bg-green-500 text-white flex items-center justify-center"
                            >
                              <Save size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditRowId(expense.id)}
                              className="h-9 px-3 rounded-xl border border-red-500 text-red-700 hover:bg-red-500 hover:text-white transition-all"
                            >
                              <Pencil size={16} />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="h-9 px-3 rounded-xl border border-red-500 text-red-700 hover:bg-red-500 hover:text-white transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {loading && (
              <div className="p-10 text-center text-gray-500">
                Loading expenses...
              </div>
            )}

            {!loading && filteredExpenses.length === 0 && (
              <div className="p-10 text-center text-gray-500">
                No expenses found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
