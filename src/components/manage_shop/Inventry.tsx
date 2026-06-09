import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { useAppSelector } from "@/store/hooks";

import {
  getInventoryAdjustments,
  getInventoryIngredients,
  createInventoryAdjustment,
  updateInventoryAdjustment,
  deleteInventoryAdjustment,
} from "@/services/inventoryAdjustmentService";

type Inventory = {
  id: number;
  date: string;
  product: string;
  quantity: string;
  reason: string;
  by: string;
  time: string;
};

export default function Inventory() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  // const [users, setUsers] = useState<any[]>([]);
  // const [loading, setLoading] = useState(false);
  const { user } = useAppSelector((state) => state.auth);

  const [search, setSearch] = useState("");

  const [editRowId, setEditRowId] = useState<number | null>(null);

  const handleDelete = async (inventoryId: number) => {
    try {
      const confirmDelete = window.confirm("Delete this inventory adjustment?");

      if (!confirmDelete) {
        return;
      }

      await deleteInventoryAdjustment(inventoryId);

      await fetchData();
    } catch (error) {
      console.log(error);
    }
  };
  const handleSave = async (item: any) => {
    try {
      if (!item.ingredientId) {
        alert("Please select ingredient");
        return;
      }

      if (!item.quantity) {
        alert("Please enter quantity");
        return;
      }

      if (item.isNew) {
        await createInventoryAdjustment({
          restaurantId: user?.restaurantId,

          branchId: user?.branchId,

          ingredientId: Number(item.ingredientId),

          quantity: Number(item.quantity),

          adjustmentType: item.adjustmentType,

          reason: item.reason || "",

          updatedById: user.id,
        });
      } else {
        await updateInventoryAdjustment(item.id, {
          ingredientId: Number(item.ingredientId),

          quantity: Number(item.quantity),

          adjustmentType: item.adjustmentType,

          reason: item.reason || "",

          updatedById: user.id,
        });
      }

      setEditRowId(null);

      await fetchData();
    } catch (error) {
      console.log(error);
    }
  };
  const filteredInventory = useMemo(() => {
    return inventory.filter((item: any) => {
      const ingredientName = item.ingredient?.name?.toLowerCase() || "";

      const reason = item.reason?.toLowerCase() || "";

      const adjustmentType = item.adjustmentType?.toLowerCase() || "";

      const updatedBy = item.updatedBy?.name?.toLowerCase() || "";

      const searchValue = search.toLowerCase();

      return (
        ingredientName.includes(searchValue) ||
        reason.includes(searchValue) ||
        adjustmentType.includes(searchValue) ||
        updatedBy.includes(searchValue)
      );
    });
  }, [inventory, search]);

  const handleChange = (id: number, field: string, value: any) => {
    setInventory((prev: any) =>
      prev.map((item: any) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const handleAddRow = () => {
    const newItem = {
      id: Date.now(),

      ingredientId: "",

      quantity: 0,

      adjustmentType: "DAMAGE",

      reason: "",

      updatedById: user.id,

      createdAt: new Date().toISOString(),

      isNew: true,
    };

    setInventory((prev) => [newItem, ...prev]);

    setEditRowId(newItem.id);
  };
  const fetchData = async () => {
    try {
      // setLoading(true);

      const [inventoryRes, ingredientRes] = await Promise.all([
        getInventoryAdjustments(user?.branchId),
        getInventoryIngredients(user?.restaurantId),
      ]);

      setInventory(inventoryRes.data || []);

      setIngredients(ingredientRes.data || []);

      // setUsers(usersRes.data || []);
    } catch (error) {
      console.log(error);
    } finally {
      // setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
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
                    onChange={(e) => setSearch(e.target.value)}
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
                  <th className="px-3 py-3 text-xs font-bold">Date</th>

                  <th className="px-3 py-3 text-xs font-bold">Ingredient</th>

                  <th className="px-3 py-3 text-xs font-bold">Quantity</th>

                  <th className="px-3 py-3 text-xs font-bold">
                    Adjustment Type
                  </th>

                  <th className="px-3 py-3 text-xs font-bold">Reason</th>

                  <th className="px-3 py-3 text-xs font-bold">Updated By</th>

                  <th className="px-3 py-3 text-xs font-bold">Actions</th>
                </tr>
              </thead>

              {/* TABLE BODY */}
              <tbody>
                {filteredInventory.map((item: any) => {
                  const isEditing = editRowId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      {/* DATE */}
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString("en-GB")}
                      </td>

                      {/* INGREDIENT */}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <select
                            value={item.ingredientId || ""}
                            onChange={(e) =>
                              handleChange(
                                item.id,
                                "ingredientId",
                                Number(e.target.value),
                              )
                            }
                            className="border rounded-md px-2 py-1 w-full text-xs"
                          >
                            <option value="">Select Ingredient</option>

                            {ingredients.map((ingredient: any) => (
                              <option key={ingredient.id} value={ingredient.id}>
                                {ingredient.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          item.ingredient?.name
                        )}
                      </td>

                      {/* QUANTITY */}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="number"
                            value={item.quantity || 0}
                            onChange={(e) =>
                              handleChange(
                                item.id,
                                "quantity",
                                Number(e.target.value),
                              )
                            }
                            className="border rounded-md px-2 py-1 w-full text-xs"
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>

                      {/* ADJUSTMENT TYPE */}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <select
                            value={item.adjustmentType}
                            onChange={(e) =>
                              handleChange(
                                item.id,
                                "adjustmentType",
                                e.target.value,
                              )
                            }
                            className="border rounded-md px-2 py-1 w-full text-xs"
                          >
                            <option value="DAMAGE">DAMAGE</option>

                            <option value="WASTAGE">WASTAGE</option>

                            <option value="EXPIRED">EXPIRED</option>

                            <option value="MANUAL">MANUAL</option>
                          </select>
                        ) : (
                          item.adjustmentType
                        )}
                      </td>

                      {/* REASON */}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            value={item.reason || ""}
                            onChange={(e) =>
                              handleChange(item.id, "reason", e.target.value)
                            }
                            className="border rounded-md px-2 py-1 w-full text-xs"
                          />
                        ) : (
                          item.reason || "-"
                        )}
                      </td>

                      {/* UPDATED BY */}
                      <td className="px-3 py-2 text-xs">
                        {item.updatedBy?.name || user?.name || "-"}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSave(item)}
                                className="h-8 px-3 rounded-lg bg-green-500 text-white"
                              >
                                Save
                              </button>

                              {item.isNew && (
                                <button
                                  onClick={() => {
                                    setInventory((prev: any) =>
                                      prev.filter(
                                        (row: any) => row.id !== item.id,
                                      ),
                                    );

                                    setEditRowId(null);
                                  }}
                                  className="h-8 px-3 rounded-lg border border-gray-300"
                                >
                                  X
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditRowId(item.id)}
                                className="h-8 w-8 rounded-lg border border-red-500 text-red-600 flex items-center justify-center"
                              >
                                <Pencil size={14} />
                              </button>

                              <button
                                onClick={() => handleDelete(item.id)}
                                className="h-8 w-8 rounded-lg border border-red-500 text-red-600 flex items-center justify-center"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
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
              Showing 1 to {filteredInventory.length} of {inventory.length}{" "}
              entries
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
