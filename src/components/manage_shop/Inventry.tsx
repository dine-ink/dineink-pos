import { useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";

type Inventory = {
  id: number;
  date: string;
  product: string;
  quantity: string;
  reason: string;
  by: string;
  time: string;
};

const initialInventory: Inventory[] = [
  {
    id: 1,
    date: "20 May 2025",
    product: "Tomato",
    quantity: "+5.00 kg",
    reason: "Stock Received",
    by: "Tom Cook",
    time: "09:00 AM",
  },
  {
    id: 2,
    date: "20 May 2025",
    product: "Onion",
    quantity: "-2.00 kg",
    reason: "Used in Preparation",
    by: "Amit Verma",
    time: "10:15 AM",
  },
  {
    id: 3,
    date: "20 May 2025",
    product: "Chicken",
    quantity: "+10.00 kg",
    reason: "Stock Received",
    by: "Neha Verma",
    time: "11:30 AM",
  },
  {
    id: 4,
    date: "19 May 2025",
    product: "Cooking Oil",
    quantity: "-1.00 L",
    reason: "Used in Preparation",
    by: "Rahul Kumar",
    time: "08:45 AM",
  },
  {
    id: 5,
    date: "19 May 2025",
    product: "Basmati Rice",
    quantity: "+20.00 kg",
    reason: "Stock Received",
    by: "Tom Cook",
    time: "01:10 PM",
  },
  {
    id: 6,
    date: "18 May 2025",
    product: "Milk",
    quantity: "-3.00 L",
    reason: "Used in Preparation",
    by: "Rajesh Sharma",
    time: "07:20 PM",
  },
  {
    id: 7,
    date: "18 May 2025",
    product: "Paneer",
    quantity: "+2.00 kg",
    reason: "Stock Received",
    by: "Vikram Reddy",
    time: "09:05 AM",
  },
  {
    id: 8,
    date: "17 May 2025",
    product: "Curd",
    quantity: "+6.00 kg",
    reason: "Stock Received",
    by: "Kiran",
    time: "03:40 PM",
  },
  {
    id: 9,
    date: "17 May 2025",
    product: "Butter",
    quantity: "-1.50 kg",
    reason: "Used in Preparation",
    by: "Sneha Patel",
    time: "06:25 PM",
  },
];

export default function Inventory() {
  const [inventory, setInventory] =
    useState(initialInventory);

  const [search, setSearch] = useState("");

  const [editRowId, setEditRowId] = useState<
    number | null
  >(null);

  const filteredInventory = useMemo(() => {
    return inventory.filter(
      (item) =>
        item.product
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.reason
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.by
          .toLowerCase()
          .includes(search.toLowerCase())
    );
  }, [inventory, search]);

  const handleChange = (
    id: number,
    field: keyof Inventory,
    value: string
  ) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
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

    const newItem: Inventory = {
      id: Date.now(),
      date: currentDate,
      product: "",
      quantity: "",
      reason: "",
      by: "",
      time: currentTime,
    };

    setInventory((prev) => [newItem, ...prev]);

    setEditRowId(newItem.id);
  };

  return (
    <div className="w-full h-screen bg-[#f7f7f7] overflow-hidden">

      {/* PAGE */}
      <div className="p-6 h-full">

        {/* CARD */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm h-full flex flex-col overflow-hidden">

          {/* HEADER */}
          <div className="p-5 border-b border-gray-100 shrink-0">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

              {/* TITLE */}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Update Inventory
                </h1>

                <p className="text-gray-500 mt-2 text-sm">
                  View and manage all inventory updates.
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
                    placeholder="Search inventory..."
                    className="w-full h-10 rounded-xl border border-gray-200 pl-12 pr-4 outline-none focus:border-red-500"
                  />
                </div>

                {/* BUTTON */}
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

          {/* TABLE AREA */}
          <div className="flex-1 overflow-auto min-h-0">

            <table className="w-full min-w-[1200px] border-collapse">

              {/* TABLE HEAD */}
              <thead className="bg-[#FAFAFA] border-b border-gray-100 sticky top-0 z-10">

                <tr className="text-left">

                  <th className="p-4 text-sm font-bold">
                    Date
                  </th>

                  <th className="p-4 text-sm font-bold">
                    Product
                  </th>

                  <th className="p-4 text-sm font-bold">
                    Quantity
                  </th>

                  <th className="p-4 text-sm font-bold">
                    Reason
                  </th>

                  <th className="p-4 text-sm font-bold">
                    By
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
                {filteredInventory.map((item) => {
                  const isEditing =
                    editRowId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-all"
                    >

                      {/* DATE */}
                      <td className="p-4 text-sm whitespace-nowrap">
                        {item.date}
                      </td>

                      {/* PRODUCT */}
                      <td className="p-4 text-sm whitespace-nowrap">
                        {isEditing ? (
                          <input
                            value={item.product}
                            onChange={(e) =>
                              handleChange(
                                item.id,
                                "product",
                                e.target.value
                              )
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none"
                          />
                        ) : (
                          item.product
                        )}
                      </td>

                      {/* QUANTITY */}
                      <td
                        className={`p-4 text-sm  whitespace-nowrap `}
                      >
                        {isEditing ? (
                          <input
                            value={item.quantity}
                            onChange={(e) =>
                              handleChange(
                                item.id,
                                "quantity",
                                e.target.value
                              )
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none text-black"
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>

                      {/* REASON */}
                      <td className="p-4 text-sm whitespace-nowrap">
                        {isEditing ? (
                          <input
                            value={item.reason}
                            onChange={(e) =>
                              handleChange(
                                item.id,
                                "reason",
                                e.target.value
                              )
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none"
                          />
                        ) : (
                          item.reason
                        )}
                      </td>

                      {/* BY */}
                      <td className="p-4 text-sm whitespace-nowrap">
                        {isEditing ? (
                          <input
                            value={item.by}
                            onChange={(e) =>
                              handleChange(
                                item.id,
                                "by",
                                e.target.value
                              )
                            }
                            className="border rounded-lg px-2 py-1 w-full outline-none"
                          />
                        ) : (
                          item.by
                        )}
                      </td>

                      {/* TIME */}
                      <td className="p-4 text-sm whitespace-nowrap">
                        {item.time}
                      </td>

                      {/* EDIT */}
                      <td className="p-4">
                        <button
                          onClick={() =>
                            setEditRowId(
                              isEditing
                                ? null
                                : item.id
                            )
                          }
                          className={`h-9 px-3 rounded-xl border flex items-center justify-center transition-all ${
                            isEditing
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-red-500 text-red-700 hover:bg-red-500 hover:text-white"
                          }`}
                        >
                          <Pencil size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}
          <div className="p-6 border-t border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">

            <p className="text-[#15163A] text-sm font-medium">
              Showing 1 to {filteredInventory.length} of{" "}
              {inventory.length} entries
            </p>

            {/* PAGINATION */}
            <div className="flex items-center gap-3">

              <button className="h-10 w-10 rounded-xl bg-gray-100 text-gray-500 text-xl">
                ‹
              </button>

              <button className="h-10 w-10 rounded-xl bg-red-500 text-white text-sm font-bold">
                1
              </button>

              <button className="h-10 w-10 rounded-xl bg-gray-100 text-gray-500 text-xl">
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}