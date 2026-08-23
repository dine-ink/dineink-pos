import { memo, useState } from "react";
import { X, Check } from "lucide-react";

type AddOnOption = { id: number; name: string; price: number };
type AddOnGroupData = { id: number; name: string; options: AddOnOption[] };

type Props = {
  itemName: string;
  groups: AddOnGroupData[];
  onConfirm: (selected: { name: string; price: number }[]) => void;
  onCancel: () => void;
};

// Optional, multi-select add-ons only (e.g. "Extra Cheese +₹40") — applied
// once per cart line, not per unit, to keep the cart's simple qty-counter
// model intact for the common case of items with no add-ons at all.
function AddOnSelectorModal({ itemName, groups, onConfirm, onCancel }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOptions = groups.flatMap((g) => g.options);
  const selectedTotal = allOptions
    .filter((o) => selectedIds.has(o.id))
    .reduce((s, o) => s + o.price, 0);

  const handleConfirm = () => {
    const selected = allOptions
      .filter((o) => selectedIds.has(o.id))
      .map((o) => ({ name: o.name, price: o.price }));
    onConfirm(selected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-bold text-foreground">Add-Ons</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{itemName}</p>
          </div>
          <button
            onClick={onCancel}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 space-y-3 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.id}>
              <p className="mb-1.5 text-[0.6875rem] font-black uppercase tracking-wide text-subtle-foreground">
                {group.name}
              </p>
              <div className="space-y-1.5">
                {group.options.map((opt) => {
                  const checked = selectedIds.has(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggle(opt.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                        checked ? "border-red-300 bg-red-50" : "border-border bg-white hover:bg-muted"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border-2 ${
                            checked ? "border-red-500 bg-red-500" : "border-input"
                          }`}
                        >
                          {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                        </span>
                        <span className="text-[13px] font-semibold text-foreground">{opt.name}</span>
                      </span>
                      <span className="text-[12px] font-bold text-red-600">+₹{opt.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border px-4 py-2 text-[13px] font-semibold text-muted-foreground hover:bg-muted"
          >
            Skip
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-xl bg-red-500 py-2 text-[13px] font-bold text-white hover:bg-red-600"
          >
            Add {selectedTotal > 0 ? `(+₹${selectedTotal})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(AddOnSelectorModal);
