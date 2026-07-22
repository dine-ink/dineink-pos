import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

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
  const [loading, setLoading] = useState(false);
  const { user } = useAppSelector((state) => state.auth);

  const [search, setSearch] = useState("");

  const [editRowId, setEditRowId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const handleDelete = async (inventoryId: number) => {
    try {
      const confirmDelete = window.confirm("Delete this inventory adjustment?");

      if (!confirmDelete) {
        return;
      }

      setLoading(true);

      await deleteInventoryAdjustment(inventoryId);

      await fetchData();
    } catch (error) {
      console.log(error);
      toast.error("Couldn't delete this adjustment — please try again.");
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async (item: any) => {
    if (!item.ingredientId) {
      alert("Please select ingredient");
      return;
    }

    if (!item.quantity) {
      alert("Please enter quantity");
      return;
    }

    try {
      setLoading(true);

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
      toast.error("Couldn't save this adjustment — please try again.");
    } finally {
      setLoading(false);
    }
  };
  const lowStockIngredients = useMemo(
    () =>
      ingredients.filter(
        (ing: any) => ing.reorderLevel != null && Number(ing.quantity || 0) <= Number(ing.reorderLevel),
      ),
    [ingredients],
  );

  const filteredInventory = useMemo(() => {
    setCurrentPage(1);

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

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);

  const paginatedItems = filteredInventory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

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
      setLoading(true);

      const [inventoryRes, ingredientRes] = await Promise.all([
        getInventoryAdjustments(user?.branchId),
        getInventoryIngredients(user?.restaurantId),
      ]);

      setInventory(inventoryRes.data || []);

      setIngredients(ingredientRes.data || []);
    } catch (error) {
      console.log(error);
      toast.error("Couldn't load inventory — check your connection.");
    } finally {
      setLoading(false);
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

          {/* LOW STOCK BANNER */}
          {lowStockIngredients.length > 0 && (
            <div className="mx-5 mt-4 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <p className="text-xs font-bold text-amber-800">
                  {lowStockIngredients.length} ingredient{lowStockIngredients.length > 1 ? "s" : ""} at or below reorder level
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lowStockIngredients.map((ing: any) => (
                  <span
                    key={ing.id}
                    className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
                  >
                    {ing.name}: {ing.quantity ?? 0} {ing.unit || ""} left
                  </span>
                ))}
              </div>
            </div>
          )}

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
                {paginatedItems.map((item: any) => {
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
                                disabled={loading}
                                className="h-8 px-3 rounded-lg bg-green-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                                disabled={loading}
                                className="h-8 w-8 rounded-lg border border-red-500 text-red-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
              Showing {filteredInventory.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredInventory.length)} of{" "}
              {filteredInventory.length} entries
            </p>

            {/* PAGINATION */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-10 w-10 rounded-xl bg-gray-100 text-gray-500 text-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹
              </button>

              <button className="h-10 w-10 rounded-xl bg-red-500 text-white text-sm font-bold">
                {currentPage}
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-10 w-10 rounded-xl bg-gray-100 text-gray-500 text-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
