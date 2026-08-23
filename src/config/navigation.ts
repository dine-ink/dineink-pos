import {
  Receipt,
  ClipboardList,
  Wifi,
  ChefHat,
  Store,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for who sees what.
 *
 * Previously the answer lived in two places that had to be kept in sync by
 * hand — an inline ternary chain in MainLayout built the nav, and
 * ProtectedRoute's allowedRoles guarded the routes — so a role could see a tab
 * it couldn't open, or open a route it had no tab for. Both now read this
 * table, which means adding a screen is one entry and the nav and the guard
 * can't disagree.
 *
 * KITCHEN is a DEPARTMENT, not a role: a kitchen tablet is signed in as
 * whatever role that person holds, and what makes it a KDS is the department.
 * A kitchen device is given only the KDS — a shared screen on the line should
 * not reach billing or the shop console.
 *
 * ONE EXCEPTION, carried over deliberately: an OWNER/MANAGER keeps full access
 * even when their own record sits in the KITCHEN department. ProtectedRoute has
 * always short-circuited on `role === "MANAGER"` before its kitchen check, so
 * narrowing that here would lock a kitchen-department manager out of the shop
 * console they can reach today. The lock is for line staff, which is who it was
 * protecting in the first place.
 */

export type Role = "OWNER" | "MANAGER" | "CASHIER" | "STAFF";

export interface NavEntry {
  /** Route path under /app. */
  path: string;
  label: string;
  /** Shorter label for the phone tab bar, where ~7 characters fit. */
  shortLabel?: string;
  icon: LucideIcon;
  roles: Role[];
  /** When set, only devices in this department see it (and they see nothing else). */
  department?: "KITCHEN";
}

const MANAGERIAL: Role[] = ["OWNER", "MANAGER"];
const TILL: Role[] = ["OWNER", "MANAGER", "CASHIER"];

export const NAV: NavEntry[] = [
  { path: "billing", label: "Billing", icon: Receipt, roles: TILL },
  { path: "orders", label: "Orders", icon: ClipboardList, roles: TILL },
  { path: "online-orders", label: "Online", icon: Wifi, roles: TILL },
  { path: "kitchen", label: "Kitchen", icon: ChefHat, roles: MANAGERIAL },
  { path: "shop", label: "Manage Shop", shortLabel: "Shop", icon: Store, roles: MANAGERIAL },
];

/** The KDS entry a kitchen-department device gets instead of the list above. */
export const KITCHEN_NAV: NavEntry = {
  path: "kitchen",
  label: "Kitchen",
  icon: ChefHat,
  roles: ["OWNER", "MANAGER", "CASHIER", "STAFF"],
  department: "KITCHEN",
};

export interface SessionUser {
  role?: string | null;
  department?: string | null;
}

const isManagerial = (user: SessionUser | null | undefined) =>
  user?.role === "OWNER" || user?.role === "MANAGER";

/**
 * True when this session should be treated as a kitchen display — i.e. locked
 * to the KDS. Managerial roles are excluded per the exception above.
 */
export const isKitchenDevice = (user: SessionUser | null | undefined) =>
  user?.department === "KITCHEN" && !isManagerial(user);

/** Nav for this session — a kitchen device gets the KDS only. */
export const navFor = (user: SessionUser | null | undefined): NavEntry[] => {
  if (isKitchenDevice(user)) return [KITCHEN_NAV];
  const role = (user?.role || "") as Role;
  return NAV.filter((n) => n.roles.includes(role));
};

/** Whether this session may open a given path — the guard's half of the table. */
export const canAccess = (user: SessionUser | null | undefined, path: string): boolean => {
  if (isKitchenDevice(user)) return path === "kitchen";
  const role = (user?.role || "") as Role;
  return NAV.some((n) => n.path === path && n.roles.includes(role));
};

/** Where a session lands on sign-in, derived from what it can actually reach. */
export const defaultRouteFor = (user: SessionUser | null | undefined): string => {
  if (isKitchenDevice(user)) return "/app/kitchen";
  const first = navFor(user)[0];
  return first ? `/app/${first.path}` : "/app/billing";
};

// ─── Manage Shop sections ────────────────────────────────────────────────────
//
// Grouped into six sections rather than one flat strip of a dozen tabs. A
// scrolling tab bar with twelve entries hides most of itself off-screen on a
// phone, which is where a manager most often uses this. Each section owns its
// own inner tabs, so nothing is more than two taps deep.
//
// These are real routes (/app/shop/<id>) rather than component state so the
// Android hardware back button steps between sections instead of exiting the
// app — the single most common complaint about state-driven tabs in a
// Capacitor shell.

export interface ShopSection {
  id: string;
  label: string;
  /** One-line description shown on the phone hub grid. */
  blurb: string;
}

export const SHOP_SECTIONS: ShopSection[] = [
  { id: "team", label: "Team", blurb: "Attendance, corrections, leave and new joiners" },
  { id: "stock", label: "Stock", blurb: "Daily count, goods received and adjustments" },
  { id: "suppliers", label: "Suppliers", blurb: "Log deliveries, settle bills, reorder" },
  { id: "menu", label: "Menu", blurb: "Correct a price or mark something sold out" },
  { id: "kitchen", label: "Kitchen Setup", blurb: "Stations, throughput, prep times, equipment, checklists" },
  { id: "money", label: "Money", blurb: "Cash sessions and daily expenses" },
];
