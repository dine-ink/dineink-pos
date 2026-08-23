import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { useAppSelector } from "@/store/hooks";

import {
  createExpense,
  deleteExpense,
  getExpenses,
  getExpenseUsers,
  updateExpense,
} from "@/services/expenseService";
import { formatCurrency, formatLongDate, formatShortDate } from "@/utils/format";
import { useSearchFilter } from "@/hooks/useSearchFilter";
import { PAYMENT_SOURCE, PAYMENT_SOURCES } from "@/constants/payment";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

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

  /** Set locally when this expense was created offline and hasn't synced yet. */
  queuedOffline?: boolean;

  paidByUser?: {
    id: number;
    name: string;
  } | null;
};

type UserType = {
  id: number;
  name: string;
};

const todayDate = formatLongDate(new Date());

export default function Expense() {
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);

  const [users, setUsers] = useState<UserType[]>([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [editRowId, setEditRowId] = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ExpenseType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { user } = useAppSelector((state) => state.auth);

  const filteredExpenses = useSearchFilter(expenses, search, (expense) => [
    expense.title,
    expense.description,
    expense.expenseType,
    expense.paidByUser?.name,
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expenseRes, usersRes] = await Promise.all([
        getExpenses(user?.branchId),
        getExpenseUsers(user?.branchId),
      ]);
      setExpenses(expenseRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.log(error);
      toast.error("Couldn't load expenses — check your connection.");
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

      restaurantId: user?.restaurantId,

      branchId: user?.branchId,

      title: "",

      description: "",

      amount: 0,

      expenseType: "",

      paymentSource: PAYMENT_SOURCES[0].value,

      paidByUserId: null,

      expenseDate: new Date().toISOString(),

      isNew: true,
    };

    setExpenses((prev) => [newExpense, ...prev]);

    setEditRowId(newExpense.id);
  };

  const handleSave = async (expense: ExpenseType) => {
    try {
      let response: any;
      if (expense.isNew) {
        response = await createExpense({
          restaurantId: user?.restaurantId,

          branchId: user?.branchId,

          title: expense.title,

          description: expense.description || "",

          amount: Number(expense.amount || 0),

          expenseType: expense.expenseType || "",

          paymentSource: expense.paymentSource,

          paidByUserId:
            expense.paymentSource === PAYMENT_SOURCE.EMPLOYEE_PAID
              ? expense.paidByUserId
              : null,

          expenseDate: expense.expenseDate,

          createdById: user.id,
        });
      } else {
        response = await updateExpense(expense.id, {
          title: expense.title,

          description: expense.description || "",

          amount: Number(expense.amount || 0),

          expenseType: expense.expenseType || "",

          paymentSource: expense.paymentSource,

          paidByUserId:
            expense.paymentSource === PAYMENT_SOURCE.EMPLOYEE_PAID
              ? expense.paidByUserId
              : null,

          expenseDate: expense.expenseDate,
        });
      }

      setEditRowId(null);

      if (response?.queuedOffline) {
        // No connection — keep showing what was just entered instead of
        // refetching (the server doesn't have this yet, so a refetch would
        // make it vanish). Locked from being edited again until it syncs, so
        // a second save can't queue a duplicate create for the same expense.
        toast("No connection — expense saved offline, will sync automatically.", { icon: "📴", duration: 5000 });
        setExpenses((prev) =>
          prev.map((e) => (e.id === expense.id ? { ...expense, queuedOffline: true } : e)),
        );
      } else {
        await fetchData();
      }
    } catch (error) {
      console.log(error);
      toast.error("Couldn't save this expense — please try again.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteExpense(deleteTarget.id);
      setDeleteTarget(null);
      await fetchData();
    } catch (error) {
      console.log(error);
      toast.error("Couldn't delete this expense — please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full h-dvh bg-muted p-2">
      <div className="rounded-card border border-border bg-card shadow-sm h-[95dvh] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="p-5 border-b border-border shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Expense Details - {todayDate}
              </h1>

              <p className="text-muted-foreground mt-2 text-sm">
                Manage all shop expense transactions.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
              <div className="relative w-full md:w-[320px]">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle-foreground"
                  size={18}
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search expense..."
                  className="w-full h-11 rounded-control border border-border pl-12 pr-4 outline-none focus:border-red-500"
                />
              </div>

              <button
                onClick={handleAddExpense}
                className="h-11 px-4 rounded-control bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={18} />
                Add Expense
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-5 pt-0 min-h-0 overflow-y-auto">
          {loading && (
            <div className="p-10">
              <LoadingIndicator variant="section" label="Loading expenses..." />
            </div>
          )}

          {!loading && filteredExpenses.length === 0 && (
            <EmptyState
              icon={<Search className="h-10 w-10 text-subtle-foreground" />}
              title={search ? "No expenses match your search" : "No expenses found"}
              className="py-10"
            />
          )}

          {!loading && filteredExpenses.length > 0 && (
            <>
              {/* MOBILE / TABLET CARDS */}
              <div className="space-y-2 xl:hidden">
                {filteredExpenses.map((expense) => {
                  const isEditing = editRowId === expense.id;
                  return (
                    <div
                      key={expense.id}
                      className="rounded-card border border-border bg-card p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <input
                              value={expense.title}
                              onChange={(e) => handleChange(expense.id, "title", e.target.value)}
                              placeholder="Title"
                              className="w-full border rounded-control min-h-10 px-2.5 py-1.5.5 text-sm font-bold outline-none focus:border-red-400"
                            />
                          ) : (
                            <h3 className="truncate text-sm font-bold text-foreground">{expense.title}</h3>
                          )}
                          <p className="mt-0.5 text-xs text-subtle-foreground">{formatShortDate(expense.expenseDate)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          {isEditing ? (
                            <button
                              onClick={() => handleSave(expense)}
                              aria-label="Save expense"
                              className="flex h-10 w-10 items-center justify-center rounded-control bg-green-500 text-white"
                            >
                              <Save size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditRowId(expense.id)}
                              disabled={expense.queuedOffline}
                              aria-label="Edit expense"
                              title={expense.queuedOffline ? "Waiting to sync before this can be edited" : undefined}
                              className="flex h-10 w-10 items-center justify-center rounded-control border border-input text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(expense)}
                            disabled={expense.queuedOffline}
                            aria-label="Delete expense"
                            title={expense.queuedOffline ? "Waiting to sync before this can be deleted" : undefined}
                            className="flex h-10 w-10 items-center justify-center rounded-control border border-red-500 text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="mt-2.5 space-y-2 border-t border-border pt-2.5">
                          <input
                            value={expense.description || ""}
                            onChange={(e) => handleChange(expense.id, "description", e.target.value)}
                            placeholder="Description"
                            className="w-full border rounded-control min-h-10 px-2.5 py-1.5.5 text-xs outline-none focus:border-red-400"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={expense.expenseType || ""}
                              onChange={(e) => handleChange(expense.id, "expenseType", e.target.value)}
                              placeholder="Type"
                              className="w-full border rounded-control min-h-10 px-2.5 py-1.5.5 text-xs outline-none focus:border-red-400"
                            />
                            <input
                              type="number"
                              value={expense.amount}
                              onChange={(e) => handleChange(expense.id, "amount", Number(e.target.value))}
                              placeholder="Amount"
                              className="w-full border rounded-control min-h-10 px-2.5 py-1.5.5 text-xs outline-none focus:border-red-400"
                            />
                          </div>
                          <select
                            value={expense.paymentSource}
                            onChange={(e) => handleChange(expense.id, "paymentSource", e.target.value)}
                            className="w-full border rounded-control min-h-10 px-2.5 py-1.5.5 text-xs outline-none focus:border-red-400"
                          >
                            {PAYMENT_SOURCES.map((source) => (
                              <option key={source.value} value={source.value}>{source.label}</option>
                            ))}
                          </select>
                          {expense.paymentSource === PAYMENT_SOURCE.EMPLOYEE_PAID && (
                            <select
                              value={expense.paidByUserId || ""}
                              onChange={(e) => handleChange(expense.id, "paidByUserId", Number(e.target.value))}
                              className="w-full border rounded-control min-h-10 px-2.5 py-1.5.5 text-xs outline-none focus:border-red-400"
                            >
                              <option value="">Select Employee</option>
                              {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge
                              tone={
                                expense.paymentSource === PAYMENT_SOURCE.SHOP_CASH
                                  ? "bg-green-100 text-green-700"
                                  : "bg-blue-100 text-blue-700"
                              }
                              size="md"
                            >
                              {PAYMENT_SOURCES.find((s) => s.value === expense.paymentSource)?.label}
                            </StatusBadge>
                            {expense.expenseType && (
                              <span className="rounded-control bg-secondary min-h-10 px-2.5 py-1.5 text-[0.6875rem] font-bold text-muted-foreground">
                                {expense.expenseType}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-black text-red-600">{formatCurrency(expense.amount)}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE */}
              <div className="hidden xl:block w-full h-full overflow-y-scroll overflow-x-scroll rounded-control border border-border">
                <table className="min-w-[1200px] w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="bg-muted text-left">
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
                          className="border-b border-border hover:bg-muted transition-all"
                        >
                          <td className="p-4 text-sm whitespace-nowrap">
                            {formatShortDate(expense.expenseDate)}
                          </td>

                          <td className="p-4">
                            {isEditing ? (
                              <input
                                value={expense.title}
                                onChange={(e) =>
                                  handleChange(expense.id, "title", e.target.value)
                                }
                                className="border rounded-control min-h-10 px-2.5 py-1.5 w-full outline-none focus:border-red-400"
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
                                className="border rounded-control min-h-10 px-2.5 py-1.5 w-full outline-none focus:border-red-400"
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
                                className="border rounded-control min-h-10 px-2.5 py-1.5 w-full outline-none focus:border-red-400"
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
                                className="border rounded-control min-h-10 px-2.5 py-1.5 w-full outline-none focus:border-red-400"
                              >
                                {PAYMENT_SOURCES.map((source) => (
                                  <option key={source.value} value={source.value}>
                                    {source.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <StatusBadge
                                tone={
                                  expense.paymentSource === PAYMENT_SOURCE.SHOP_CASH
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-700"
                                }
                                size="md"
                              >
                                {PAYMENT_SOURCES.find((s) => s.value === expense.paymentSource)?.label}
                              </StatusBadge>
                            )}
                          </td>

                          <td className="p-4">
                            {isEditing ? (
                              expense.paymentSource === PAYMENT_SOURCE.EMPLOYEE_PAID ? (
                                <select
                                  value={expense.paidByUserId || ""}
                                  onChange={(e) =>
                                    handleChange(
                                      expense.id,
                                      "paidByUserId",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="border rounded-control min-h-10 px-2.5 py-1.5 w-full outline-none focus:border-red-400"
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
                            ) : expense.paymentSource === PAYMENT_SOURCE.SHOP_CASH ? (
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
                                className="border rounded-control min-h-10 px-2.5 py-1.5 w-full outline-none focus:border-red-400"
                              />
                            ) : (
                              formatCurrency(expense.amount)
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {isEditing ? (
                                <button
                                  onClick={() => handleSave(expense)}
                                  aria-label="Save expense"
                                  className="h-9 px-3 rounded-control bg-green-500 text-white flex items-center justify-center"
                                >
                                  <Save size={16} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setEditRowId(expense.id)}
                                  disabled={expense.queuedOffline}
                                  aria-label="Edit expense"
                                  title={expense.queuedOffline ? "Waiting to sync before this can be edited" : undefined}
                                  className="h-9 px-3 rounded-control border border-input text-muted-foreground hover:bg-secondary transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Pencil size={16} />
                                </button>
                              )}

                              <button
                                onClick={() => setDeleteTarget(expense)}
                                disabled={expense.queuedOffline}
                                aria-label="Delete expense"
                                title={expense.queuedOffline ? "Waiting to sync before this can be deleted" : undefined}
                                className="h-9 px-3 rounded-control border border-red-500 text-red-700 hover:bg-red-500 hover:text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
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
              </div>
            </>
          )}
        </div>
      </div>

      {/* DELETE CONFIRM MODAL */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete expense?"
        description={
          deleteTarget && (
            <>"{deleteTarget.title}" — {formatCurrency(deleteTarget.amount)}. This cannot be undone.</>
          )
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmDisabled={deleting}
      />
    </div>
  );
}
