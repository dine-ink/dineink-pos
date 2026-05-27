import { useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";

type Expense = {
  id: number;
  date: string;
  shopCash: string;
  othersCash: string;
  from: string;
  to: string;
  reason: string;
  amount: string;
  time: string;
};

const initialExpenses: Expense[] = [
  {
    id: 1,
    date: "27 May 2026",
    shopCash: "25000",
    othersCash: "5000",
    from: "Cash Counter",
    to: "Vegetable Shop",
    reason: "Vegetable Purchase",
    amount: "2500",
    time: "09:30 AM",
  },
  {
    id: 2,
    date: "27 May 2026",
    shopCash: "22000",
    othersCash: "4000",
    from: "Manager",
    to: "Electrician",
    reason: "Electrical Repair",
    amount: "1500",
    time: "11:15 AM",
  },
  {
    id: 3,
    date: "27 May 2026",
    shopCash: "20000",
    othersCash: "3500",
    from: "Cash Counter",
    to: "Milk Supplier",
    reason: "Milk Purchase",
    amount: "1200",
    time: "12:45 PM",
  },
  {
    id: 4,
    date: "27 May 2026",
    shopCash: "18000",
    othersCash: "2500",
    from: "Owner",
    to: "Staff",
    reason: "Salary Advance",
    amount: "3000",
    time: "02:00 PM",
  },
  {
    id: 5,
    date: "27 May 2026",
    shopCash: "16000",
    othersCash: "2000",
    from: "Cash Counter",
    to: "Gas Agency",
    reason: "Cylinder Payment",
    amount: "2200",
    time: "04:30 PM",
  },
  {
    id: 6,
    date: "27 May 2026",
    shopCash: "14000",
    othersCash: "1500",
    from: "Manager",
    to: "Cleaning Service",
    reason: "Shop Cleaning",
    amount: "1000",
    time: "06:15 PM",
  },
  {
    id: 7,
    date: "27 May 2026",
    shopCash: "12000",
    othersCash: "1200",
    from: "Cash Counter",
    to: "Water Supplier",
    reason: "Water Can Purchase",
    amount: "600",
    time: "07:00 PM",
  },
  {
    id: 8,
    date: "27 May 2026",
    shopCash: "10000",
    othersCash: "1000",
    from: "Owner",
    to: "Internet Provider",
    reason: "WiFi Bill",
    amount: "1800",
    time: "08:10 PM",
  },
  {
    id: 9,
    date: "27 May 2026",
    shopCash: "9000",
    othersCash: "800",
    from: "Manager",
    to: "Stationery Shop",
    reason: "Office Supplies",
    amount: "750",
    time: "09:00 PM",
  },
];

const todayDate = new Date().toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export default function Expense() {
  const [expenses, setExpenses] = useState(initialExpenses);

  const [search, setSearch] = useState("");

  const [editRowId, setEditRowId] = useState<number | null>(
    null
  );

  const filteredExpenses = useMemo(() => {
    return expenses.filter(
      (expense) =>
        expense.reason
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        expense.to
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        expense.from
          .toLowerCase()
          .includes(search.toLowerCase())
    );
  }, [expenses, search]);

  const handleChange = (
    id: number,
    field: keyof Expense,
    value: string
  ) => {
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id
          ? {
              ...expense,
              [field]: value,
            }
          : expense
      )
    );
  };

  const handleAddRow = () => {
    const currentDate = new Date().toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

    const currentTime = new Date().toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

    const newExpense: Expense = {
      id: Date.now(),
      date: currentDate,
      shopCash: "",
      othersCash: "",
      from: "",
      to: "",
      reason: "",
      amount: "",
      time: currentTime,
    };

    setExpenses((prev) => [newExpense, ...prev]);

    setEditRowId(newExpense.id);
  };

  return (
    <div className="w-full h-screen bg-gray-50 p-2">

      {/* MAIN CARD */}
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

            {/* SEARCH + BUTTON */}
            <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">

              {/* SEARCH */}
              <div className="relative w-full md:w-[320px]">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search expense..."
                  className="w-full h-10 rounded-xl border border-gray-200 pl-12 pr-4 outline-none focus:border-red-500"
                />
              </div>

              {/* ADD BUTTON */}
              <button
                onClick={handleAddRow}
                className="h-10 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={18} />
                Add Details
              </button>
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="flex-1 p-5 pt-0 min-h-0">

          {/* SCROLL AREA */}
          <div className="w-full h-full overflow-y-scroll overflow-x-scroll rounded-xl border border-gray-100">

            <table className="min-w-[1400px] w-full border-collapse">

              {/* TABLE HEAD */}
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr className="bg-gray-50 text-left">

                  <th className="p-4 text-sm font-bold">
                    Date
                  </th>

                  <th className="p-4 text-sm font-bold">
                    Shop Cash
                  </th>

                  <th className="p-4 text-sm font-bold">
                    Others Cash
                  </th>

                  <th className="p-4 text-sm font-bold">
                    From
                  </th>

                  <th className="p-4 text-sm font-bold">
                    To
                  </th>

                  <th className="p-4 text-sm font-bold">
                    Reason
                  </th>

                  <th className="p-4 text-sm font-bold">
                    Amount
                  </th>

                  <th className="p-4 text-sm font-bold">
                    Time
                  </th>

                  <th className="p-4 text-sm font-bold">
                    Edit
                  </th>
                </tr>
              </thead>

              {/* TABLE BODY */}
              <tbody>
                {filteredExpenses.map((expense) => {
                  const isEditing =
                    editRowId === expense.id;

                  return (
                    <tr
                      key={expense.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-all"
                    >

                      {/* DATE */}
                      <td className="p-4 text-sm whitespace-nowrap">
                        {expense.date}
                      </td>

                      {/* SHOP CASH */}
                      <td className="p-4 text-sm whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={expense.shopCash}
                            onChange={(e) =>
                              handleChange(
                                expense.id,
                                "shopCash",
                                e.target.value
                              )
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none"
                          />
                        ) : (
                          `₹ ${expense.shopCash}`
                        )}
                      </td>

                      {/* OTHERS CASH */}
                      <td className="p-4 text-sm whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={expense.othersCash}
                            onChange={(e) =>
                              handleChange(
                                expense.id,
                                "othersCash",
                                e.target.value
                              )
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none"
                          />
                        ) : (
                          `₹ ${expense.othersCash}`
                        )}
                      </td>

                      {/* FROM */}
                      <td className="p-4 text-sm whitespace-nowrap">
                        {isEditing ? (
                          <input
                            value={expense.from}
                            onChange={(e) =>
                              handleChange(
                                expense.id,
                                "from",
                                e.target.value
                              )
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none"
                          />
                        ) : (
                          expense.from
                        )}
                      </td>

                      {/* TO */}
                      <td className="p-4 text-sm whitespace-nowrap">
                        {isEditing ? (
                          <input
                            value={expense.to}
                            onChange={(e) =>
                              handleChange(
                                expense.id,
                                "to",
                                e.target.value
                              )
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none"
                          />
                        ) : (
                          expense.to
                        )}
                      </td>

                      {/* REASON */}
                      <td className="p-4 text-sm whitespace-nowrap">
                        {isEditing ? (
                          <input
                            value={expense.reason}
                            onChange={(e) =>
                              handleChange(
                                expense.id,
                                "reason",
                                e.target.value
                              )
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none"
                          />
                        ) : (
                          expense.reason
                        )}
                      </td>

                      {/* AMOUNT */}
                      <td className="p-4 text-sm whitespace-nowrap text-red-500">
                        {isEditing ? (
                          <input
                            type="text"
                            value={expense.amount}
                            onChange={(e) =>
                              handleChange(
                                expense.id,
                                "amount",
                                e.target.value
                              )
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none"
                          />
                        ) : (
                          `₹ ${expense.amount}`
                        )}
                      </td>

                      {/* TIME */}
                      <td className="p-4 text-sm whitespace-nowrap">
                        {expense.time}
                      </td>

                      {/* EDIT BUTTON */}
                      <td className="p-4">
                        <button
                          onClick={() =>
                            setEditRowId(
                              isEditing
                                ? null
                                : expense.id
                            )
                          }
                          className={`h-9 px-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                            isEditing
                              ? "bg-green-500 text-white border-green-500"
                              : "border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          <Pencil size={16} />

                          {isEditing && "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        </div>
      </div>
    </div>
  );
}