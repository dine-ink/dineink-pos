import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * One dialog, two presentations: a bottom sheet on a phone, a centred panel
 * from `sm` up.
 *
 * The sheet form isn't cosmetic — a centred modal on a phone puts its fields
 * under the on-screen keyboard and its footer off the bottom of the viewport.
 * Anchoring to the bottom keeps the action row above the keyboard and within
 * thumb reach, which is where every form in this app is actually submitted.
 *
 * Deliberately not the radix Dialog in components/ui/dialog.tsx: that one is
 * unused, untested here, and brings a focus-trap/portal stack this app doesn't
 * otherwise rely on. This is small enough to reason about, and the POS only
 * ever shows one modal at a time.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  /** Wider panel for tables/lists rather than a form. */
  size = "default",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "wide";
}) {
  // Escape to dismiss, and lock the body so the page behind doesn't scroll
  // under the sheet on iOS.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        // Stops a click inside the panel from bubbling to the backdrop's
        // dismiss handler — otherwise selecting anything closes the form.
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex max-h-[92dvh] w-full flex-col overflow-hidden bg-card shadow-xl",
          "rounded-t-2xl sm:rounded-card",
          size === "wide" ? "sm:max-w-4xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-border bg-card px-4 py-3 pad-safe-bottom">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}
