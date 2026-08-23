import { NavLink, Outlet } from "react-router-dom";
import { SHOP_SECTIONS } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * Manage Shop shell. Sections are links, not tab state, so the Android
 * hardware back button walks back through them instead of exiting the app —
 * the usual failure of a state-driven tab bar inside a Capacitor shell.
 *
 * Six sections rather than the dozen individual screens they contain: a
 * scrolling strip of twelve tabs hides most of itself on a phone, which is
 * where a manager most often opens this. Each section owns its own inner tabs,
 * so nothing sits more than two taps down.
 */
export default function ShopLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 border-b border-border bg-card">
        <div className="hide-scrollbar flex gap-1 overflow-x-auto px-2 py-2 sm:px-3">
          {SHOP_SECTIONS.map((s) => (
            <NavLink
              key={s.id}
              to={s.id}
              title={s.blurb}
              className={({ isActive }) =>
                cn(
                  "flex h-10 shrink-0 items-center rounded-control border px-3.5 text-[0.8125rem] font-semibold transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              {s.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
