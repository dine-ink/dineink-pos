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
} from "lucide-react";

const navItems = [
  { name: "Billing", href: "/app/billing", icon: Receipt },
  { name: "Orders", href: "/app/orders", icon: ClipboardList },
  { name: "Online", href: "/app/online-orders", icon: Wifi },
  { name: "Shop", href: "/app/manage-shop", icon: Store },
];

export default function MainLayout() {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.clear();
    navigate("/login");
  };

  const initial = user?.name?.[0]?.toUpperCase() || "U";

  return (
    <div className="flex h-dvh flex-col bg-gray-50">
      {/* ===== TOP NAVBAR ===== */}
      <header className="shrink-0 z-50 bg-gradient-to-r from-red-600 via-red-500 to-rose-500 shadow-lg">
        <div className="flex h-14 items-center justify-between px-3 sm:px-4">
          {/* BRAND */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
              <span className="text-base font-black text-white">D</span>
            </div>
            <div>
              <h1 className="text-base font-black leading-none tracking-tight">
                <span className="text-white">Dine</span>
                <span className="text-red-200">Ink</span>
              </h1>
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-red-100/70 leading-none mt-0.5">
                Restaurant POS
              </p>
            </div>
          </div>

          {/* DESKTOP NAV LINKS */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    active
                      ? "bg-white text-red-600 shadow-sm"
                      : "text-red-50/90 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-1.5">
            {/* LIVE INDICATOR */}
            <div className="hidden xl:flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[10px] font-bold tracking-widest text-white uppercase">
                Live
              </span>
            </div>

            {/* BELL */}
            <button className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 ring-1 ring-red-500" />
            </button>

            {/* PROFILE */}
            <Menu as="div" className="relative">
              <MenuButton className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white transition hover:bg-white/30 ring-1 ring-white/20">
                <span className="text-sm font-black">{initial}</span>
              </MenuButton>
              <MenuItems className="absolute right-0 mt-2 w-52 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-2xl outline-none z-50">
                <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-tight">
                      {user?.name || "Staff"}
                    </p>
                    <p className="text-xs text-gray-500 capitalize leading-tight mt-0.5">
                      {user?.role || "Cashier"}
                    </p>
                  </div>
                </div>
                <div className="h-px bg-gray-100 mb-1" />
                <MenuItem>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
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
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
              >
                <div
                  className={`flex h-8 w-10 items-center justify-center rounded-xl transition-all ${
                    active ? "bg-red-50" : ""
                  }`}
                >
                  <Icon
                    className={`h-[22px] w-[22px] transition-colors ${
                      active ? "text-red-600" : "text-gray-400"
                    }`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>
                <span
                  className={`text-[10px] font-bold leading-none ${
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
