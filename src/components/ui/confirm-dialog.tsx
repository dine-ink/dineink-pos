import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ConfirmDialogTone = "danger" | "warning";

const TONE_BUTTON_CLASSES: Record<ConfirmDialogTone, string> = {
  danger: "bg-red-500 hover:bg-red-600",
  warning: "bg-amber-500 hover:bg-amber-600",
};

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** Extra content between the description and the button row (e.g. Refund's amount/reason fields, Cash Session's expected/actual summary). */
  children?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
  tone?: ConfirmDialogTone;
  /** Refund's modal shows a small ✕ next to the title instead of relying only on the Cancel button. */
  showCloseIcon?: boolean;
};

// Consolidates the confirm/destructive-action modal shape already used
// consistently across Void, Delete (Expense/Inventory), Close Session, and
// Refund — same backdrop, card, title/description, and Cancel+Confirm
// button row. Presentational only; each caller keeps its own state/handlers.
export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  confirmDisabled = false,
  tone = "danger",
  showCloseIcon = false,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-foreground">{title}</h3>
          {showCloseIcon && (
            <button
              onClick={onCancel}
              aria-label="Close"
              className="text-subtle-foreground hover:text-muted-foreground"
            >
              ✕
            </button>
          )}
        </div>
        {description && <p className="mt-1 text-[12px] text-muted-foreground">{description}</p>}
        {children}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border bg-white py-2.5 text-xs font-bold text-foreground"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60",
              TONE_BUTTON_CLASSES[tone],
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
