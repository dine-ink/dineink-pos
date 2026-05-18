type Props = {
  selectedTable: any;
  setSelectedTable: any;
};

export default function TableInfoBar({
  selectedTable,
  setSelectedTable,
}: Props) {
  if (!selectedTable) return null;

  return (
    <div className="border-b border-gray-100 bg-red-50 px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Selected Table</p>

          <h2 className="text-lg font-black text-gray-900">
            {selectedTable.name}
          </h2>
        </div>

        <button
          onClick={() => setSelectedTable(null)}
          className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-sm"
        >
          Change
        </button>
      </div>
    </div>
  );
}
