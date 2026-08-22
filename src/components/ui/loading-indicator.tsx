import { cn } from "@/lib/utils";

type LoadingIndicatorVariant = "page" | "section" | "button";

const RING_CLASSES: Record<LoadingIndicatorVariant, string> = {
  page: "h-8 w-8 border-[3px] border-gray-200 border-t-red-500",
  section: "h-5 w-5 border-2 border-gray-200 border-t-red-500",
  button: "h-3.5 w-3.5 border-2 border-white/30 border-t-white",
};

type LoadingIndicatorProps = {
  /** "page" = PageLoader's full-page ring. "section" = smaller inline ring for an in-page loading row. "button" = white ring for use inside a colored button. */
  variant?: LoadingIndicatorVariant;
  label?: string;
  className?: string;
};

// Single source of truth for the spinner ring — previously `PageLoader`,
// `LoginPage`'s submit button, and Attendance/Expense/Inventory's initial
// load each had their own (or, for the latter three, none at all beyond
// plain text). Presentational only.
export function LoadingIndicator({ variant = "page", label, className }: LoadingIndicatorProps) {
  const isColumn = variant === "page";
  return (
    <div className={cn("flex items-center justify-center", isColumn ? "flex-col gap-3" : "gap-2", className)}>
      <div className={cn("animate-spin rounded-full", RING_CLASSES[variant])} />
      {label && (
        <p
          className={cn(
            "font-semibold",
            variant === "button" ? "text-xs text-white" : "text-xs text-gray-400",
          )}
        >
          {label}
        </p>
      )}
    </div>
  );
}
