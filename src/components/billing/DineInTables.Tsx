type Props = {
  tables: any[];
  setSelectedTable: any;
};

export default function DineInTables({ tables, setSelectedTable }: Props) {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-black text-gray-900">Select Table</h2>

        <p className="mt-1 text-xs text-gray-500">
          Choose table to start billing
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tables.map((table) => {
          const occupied = table.status === "OCCUPIED";

          return (
            <button
              key={table.id}
              onClick={() => setSelectedTable(table)}
              className={`rounded-2xl border p-4 text-left shadow-sm ${
                occupied
                  ? "border-red-100 bg-red-50"
                  : "border-emerald-100 bg-emerald-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900">
                  {table.name}
                </h2>

                <div
                  className={`h-3 w-3 rounded-full ${
                    occupied ? "bg-red-500" : "bg-emerald-500"
                  }`}
                />
              </div>

              <div className="mt-4">
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                    occupied
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {occupied ? "Occupied" : "Available"}
                </span>

                <p className="mt-3 text-xs text-gray-500">
                  Capacity: {table.capacity}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
