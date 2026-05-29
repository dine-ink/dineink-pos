import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "@/store/slices/authSlice";
import { useAppSelector } from "@/store/hooks";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  Receipt,
  ClipboardList,
  Wifi,
  Store,
  Bell,
  LogOut,
  User,
  ChefHat,
} from "lucide-react";

export default function MainLayout() {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const isKitchen = user?.department === "KITCHEN";

  const navItems = isKitchen
    ? [{ name: "Kitchen", href: "/app/kitchen", icon: ChefHat }]
    : [
        { name: "Billing", href: "/app/billing", icon: Receipt },

        ...(user?.department !== "WAITER"
          ? [
              { name: "Orders", href: "/app/orders", icon: ClipboardList },
              { name: "Online", href: "/app/online-orders", icon: Wifi },
            ]
          : []),

        ...(user?.role === "MANAGER"
          ? [{ name: "Shop", href: "/app/manage-shop", icon: Store }]
          : []),
      ];
  const handleLogout = () => {
    dispatch(logout());
    localStorage.clear();
    navigate("/login");
  };

  const initial = user?.name?.[0]?.toUpperCase() || "U";

  return (
    <div className="flex h-dvh flex-col bg-gray-50">
      {/* ===== TOP NAVBAR ===== */}
      <header className="shrink-0 z-50 bg-gradient-to-r from-red-600 via-red-500 to-rose-500 shadow-md">
        <div className="flex h-10 items-center justify-between px-3">
          {/* BRAND */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
              <span className="text-xs font-black text-white">D</span>
            </div>
            <div>
              <h1 className="text-sm font-black leading-none tracking-tight">
                <span className="text-white">Dine</span>
                <span className="text-red-200">Ink</span>
              </h1>
              <p className="text-[7px] font-bold uppercase tracking-widest text-red-100/70 leading-none">
                POS
              </p>
            </div>
          </div>

          {/* DESKTOP NAV LINKS */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const active = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    active
                      ? "bg-white text-red-600 shadow-sm"
                      : "text-red-50/90 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-1">
            {/* LIVE INDICATOR */}
            <div className="hidden xl:flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[9px] font-bold tracking-widest text-white uppercase">
                Live
              </span>
            </div>

            {/* BELL */}
            <button className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25">
              <Bell className="h-3.5 w-3.5" />
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-400 ring-1 ring-red-500" />
            </button>

            {/* PROFILE */}
            <Menu as="div" className="relative">
              <MenuButton className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30 ring-1 ring-white/20">
                <span className="text-xs font-black">{initial}</span>
              </MenuButton>
              <MenuItems className="absolute right-0 mt-1.5 w-44 rounded-xl border border-gray-100 bg-white p-1 shadow-xl outline-none z-50">
                <div className="flex items-center gap-2 px-2 py-2 mb-0.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-tight">
                      {user?.name || "Staff"}
                    </p>
                    <p className="text-[10px] text-gray-500 capitalize leading-tight">
                      {user?.role || "Cashier"}
                    </p>
                  </div>
                </div>
                <div className="h-px bg-gray-100 mb-0.5" />
                <MenuItem>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </div>
      </header>

      {/* ===== PAGE CONTENT ===== */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>

      {/* ===== MOBILE BOTTOM TAB BAR ===== */}
      <nav className="shrink-0 md:hidden border-t border-gray-200 bg-white">
        <div className="flex">
          {navItems.map((item) => {
            const active = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5"
              >
                <div
                  className={`flex h-7 w-8 items-center justify-center rounded-lg transition-all ${
                    active ? "bg-red-50" : ""
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] transition-colors ${
                      active ? "text-red-600" : "text-gray-400"
                    }`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>
                <span
                  className={`text-[9px] font-bold leading-none ${
                    active ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
