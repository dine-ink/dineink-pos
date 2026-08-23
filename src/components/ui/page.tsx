import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Page chrome shared by every screen.
 *
 * The shape it enforces matters on a touch device: the header and any tab bar
 * stay put (`shrink-0`) while only the body scrolls, so a manager scrolling a
 * 200-row stock audit never loses the Save action off the top of the screen.
 * Screens compose Screen > PageHeader + ScreenBody rather than each managing
 * its own overflow, which is what previously let some tabs scroll the whole
 * document and others scroll an inner div.
 */

export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex h-full min-h-0 flex-col bg-background", className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Buttons. Wrap onto their own row on a phone rather than squeezing the title. */
  actions?: ReactNode;
  /** Search fields, filters — sits below the title row. */
  children?: ReactNode;
}) {
  return (
    <div className="shrink-0 border-b border-border bg-card px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function ScreenBody({
  children,
  className,
  /** Caps content width on a desktop — forms are unreadable at 2000px wide. */
  narrow,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className={cn("p-3 sm:p-4", narrow && "mx-auto w-full max-w-3xl", className)}>{children}</div>
    </div>
  );
}

/** Sticky footer for a screen's primary action — always reachable with a thumb. */
export function ScreenFooter({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 border-t border-border bg-card px-3 py-2.5 pad-safe-bottom sm:px-4">
      <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border border-border bg-card", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

/**
 * Horizontally scrolling tab bar. Scrolls rather than wraps because a wrapped
 * two-row tab bar shifts the content below it as the selection moves, which on
 * a phone reads as the page jumping.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: T; label: string; icon?: ReactNode; badge?: number }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("shrink-0 border-b border-border bg-card", className)}>
      <div className="hide-scrollbar flex gap-1 overflow-x-auto px-2 py-2 sm:px-3">
        {tabs.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.id)}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-control border px-3 text-[0.8125rem] font-semibold transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {t.icon}
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold tnum",
                    active ? "bg-white/25 text-white" : "bg-primary/10 text-primary",
                  )}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Compact metric. Grid of these reads as a summary strip above a list. */
export function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const toneCls = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    info: "text-info",
  }[tone];
  return (
    <div className="rounded-card border border-border bg-card px-3 py-2.5">
      <p className="text-[0.625rem] font-bold tracking-wide text-subtle-foreground uppercase">{label}</p>
      <p className={cn("mt-0.5 text-xl font-bold tnum", toneCls)}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Inline advisory. `tone` carries the meaning; the icon slot is for emphasis only. */
export function Banner({
  tone = "info",
  title,
  children,
  icon,
  action,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  const cls = {
    info: "border-info/30 bg-info-muted text-info",
    warning: "border-warning/30 bg-warning-muted text-warning",
    danger: "border-destructive/30 bg-destructive/8 text-destructive",
    success: "border-success/30 bg-success-muted text-success",
  }[tone];
  return (
    <div className={cn("flex items-start gap-2.5 rounded-card border px-3 py-2.5", cls)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">
        {title && <p className="text-[0.8125rem] font-bold">{title}</p>}
        {children && <div className="text-xs leading-relaxed opacity-90">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
