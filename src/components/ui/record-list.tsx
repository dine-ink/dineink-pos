import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

/**
 * One responsive list, two renderings: stacked cards up to `xl`, a real table
 * from `xl` up.
 *
 * Every screen in this app previously hand-wrote both — Inventry, Attendance
 * and Expense each carried a "MOBILE / TABLET CARDS" block and a duplicate
 * "DESKTOP TABLE" block over the same data, which is where their layouts had
 * already drifted apart from one another. Declaring the columns once and
 * letting this pick the presentation keeps a phone and a desktop showing the
 * same fields in the same order, and means a new column can't be added to one
 * view and forgotten in the other.
 *
 * `primary`/`secondary`/`meta` describe a column's ROLE, which is what the
 * card layout needs (title line, subtitle, badge row) and what the table
 * ignores beyond alignment. That's why columns aren't just header+render.
 */

export interface RecordColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /**
   * primary   — the card's title line (first one wins; usually a name).
   * secondary — sits under the title, quieter.
   * meta      — badge/detail row at the bottom of the card.
   * numeric   — right-aligned in the table, shown as a labelled figure on a card.
   */
  role?: "primary" | "secondary" | "meta" | "numeric";
  /** Hide entirely below xl — for columns only worth the space on a desktop table. */
  tableOnly?: boolean;
  className?: string;
  headerClassName?: string;
}

interface RecordListProps<T> {
  columns: RecordColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  loadingLabel?: string;
  /** Rendered at the right edge of each row/card — edit, delete, etc. */
  actions?: (row: T) => ReactNode;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Adds a tinted left edge / ring to flag a row needing attention. */
  rowTone?: (row: T) => "default" | "warning" | "danger" | "success";
  onRowClick?: (row: T) => void;
  className?: string;
}

const toneRing: Record<string, string> = {
  default: "",
  warning: "ring-1 ring-warning/30 bg-warning-muted/40",
  danger: "ring-1 ring-destructive/30 bg-destructive/5",
  success: "ring-1 ring-success/30 bg-success-muted/40",
};

export function RecordList<T>({
  columns,
  rows,
  rowKey,
  loading,
  loadingLabel = "Loading…",
  actions,
  emptyIcon,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  rowTone,
  onRowClick,
  className,
}: RecordListProps<T>) {
  if (loading && rows.length === 0) {
    return (
      <div className="py-10">
        <LoadingIndicator variant="section" label={loadingLabel} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon ?? <span className="text-2xl">📋</span>}
        title={emptyTitle}
        description={emptyDescription}
        className="py-14"
      />
    );
  }

  const primary = columns.find((c) => c.role === "primary") ?? columns[0];
  const secondary = columns.filter((c) => c.role === "secondary");
  const numeric = columns.filter((c) => c.role === "numeric");
  const meta = columns.filter((c) => c.role === "meta");
  const rest = columns.filter(
    (c) => c !== primary && !c.tableOnly && !secondary.includes(c) && !numeric.includes(c) && !meta.includes(c),
  );

  return (
    <div className={cn("min-h-0 flex-1", className)}>
      {/* ── Cards: phone + tablet ─────────────────────────────────────── */}
      <div className="flex flex-col gap-2 xl:hidden">
        {rows.map((row) => {
          const tone = rowTone?.(row) ?? "default";
          return (
            <div
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "rounded-card border border-border bg-card p-3 shadow-sm",
                toneRing[tone],
                onRowClick && "cursor-pointer active:bg-muted",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-foreground">{primary.render(row)}</div>
                  {secondary.map((c) => (
                    <div key={c.key} className="mt-0.5 truncate text-xs text-muted-foreground">
                      {c.render(row)}
                    </div>
                  ))}
                </div>
                {actions && <div className="flex shrink-0 items-center gap-2">{actions(row)}</div>}
              </div>

              {(numeric.length > 0 || rest.length > 0) && (
                <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-2.5 sm:grid-cols-3">
                  {[...numeric, ...rest].map((c) => (
                    <div key={c.key} className="min-w-0">
                      <p className="text-[0.625rem] font-bold tracking-wide text-subtle-foreground uppercase">
                        {c.header}
                      </p>
                      <div className="truncate text-sm font-semibold text-foreground tnum">{c.render(row)}</div>
                    </div>
                  ))}
                </div>
              )}

              {meta.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border pt-2.5">
                  {meta.map((c) => (
                    <div key={c.key}>{c.render(row)}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Table: desktop ───────────────────────────────────────────── */}
      <div className="hidden overflow-x-auto rounded-card border border-border bg-card xl:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-3 py-2.5 text-left text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase whitespace-nowrap",
                    c.role === "numeric" && "text-right",
                    c.headerClassName,
                  )}
                >
                  {c.header}
                </th>
              ))}
              {actions && <th className="px-3 py-2.5 text-right text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const tone = rowTone?.(row) ?? "default";
              return (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-border last:border-0 hover:bg-muted/50",
                    tone !== "default" && toneRing[tone],
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-3 py-2.5 text-sm text-foreground",
                        c.role === "numeric" && "text-right tnum font-semibold",
                        c.role === "secondary" && "text-muted-foreground",
                        c.className,
                      )}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-2">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
