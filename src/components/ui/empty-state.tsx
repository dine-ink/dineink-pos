import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  /** Pre-sized icon element — an emoji wrapped in a sized span, or a lucide icon component. */
  icon: ReactNode;
  title: string;
  description?: string;
  className?: string;
};

// Standardizes the "nothing here" treatment that previously drifted across
// screens (emoji vs. lucide icon, and 3 different title colors/weights for
// the same semantic role) into one typography convention. Each call site
// keeps its own icon and wording — only the layout/type converge.
export function EmptyState({ icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1.5 py-10 text-center", className)}>
      {icon}
      <p className="text-sm font-bold text-gray-700">{title}</p>
      {description && <p className="text-xs text-gray-400">{description}</p>}
    </div>
  );
}
