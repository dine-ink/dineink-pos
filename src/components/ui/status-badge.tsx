import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  /** Color classes only, e.g. "bg-blue-100 text-blue-700" — color logic stays with each caller. */
  tone: string;
  /** "sm" = compact card/inline context (9px, font-black). "md" = table-row context (10px, font-bold). */
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
};

// Centralizes the pill shape already used consistently for order/payment/
// platform/kitchen-status badges across the app (rounded-full, px-2 py-0.5,
// card=font-black/9px vs table=font-bold/10px) so every status badge in the
// app renders through one implementation instead of re-typed inline classes.
export function StatusBadge({ tone, size = "sm", className, children }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5",
        size === "sm" ? "text-[0.6875rem] font-black" : "text-[0.6875rem] font-bold",
        tone,
        className,
      )}
    >
      {children}
    </span>
  );
}
