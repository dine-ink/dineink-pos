import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { Bars3Icon, BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Link, Outlet, useLocation } from "react-router-dom";
const user = {
  name: "Tom Cook",
  email: "tom@example.com",
  imageUrl:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
};
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { logout } from "@/store/slices/authSlice";

const navigation = [
  { name: "Billing", href: "/app/billing", current: true },
  { name: "Order History", href: "/app/orders", current: false },
  { name: "Online Orders", href: "/app/online-orders", current: false },
  { name: "Manage Shop", href: "/app/manage-shop", current: false },
];

const userNavigation = [
  { name: "Your profile", href: "#" },
  { name: "Settings", href: "#" },
  { name: "Sign out", href: "#" },
];

export default function MainLayout() {
  const location = useLocation();
  const dispatch = useDispatch();

  const navigate = useNavigate();
  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-red-50/20">
      {/* ================= NAVBAR ================= */}
      <Disclosure
        as="nav"
        className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-red-600 via-red-500 to-rose-500 shadow-[0_10px_40px_rgba(220,38,38,0.22)] backdrop-blur-2xl"
      >
        <div className="mx-auto px-3 sm:px-5">
          <div className="flex h-[60px] items-center justify-between">
            {/* ================= LEFT ================= */}
            <div className="flex items-center gap-4">
              {/* ================= BRAND ================= */}
              <div className="flex items-center gap-3">
                {/* LOGO */}
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20 backdrop-blur-md">
                  <span className="text-xl font-black tracking-tight text-white">
                    D
                  </span>
                </div>
                {/* BRANDING */}
                <div className="hidden sm:block">
                  <h1 className="whitespace-nowrap text-lg font-black leading-none tracking-tight">
                    <span className="text-white">Dine</span>
                    <span className="text-red-200">Ink</span>
                  </h1>
                  <p className="mt-1 whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.22em] text-red-100/70">
                    Restaurant Intelligence
                  </p>
                </div>
              </div>
              {/* ================= NAVIGATION ================= */}
              <div className="hidden md:block">
                <div className="ml-6 flex items-center gap-2">
                  {navigation.map((item) => {
                    const active = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition-all duration-200 ${
                          active
                            ? "bg-white text-red-600 shadow-[0_10px_25px_rgba(255,255,255,0.18)]"
                            : "text-red-50/90 hover:bg-white/10 hover:text-white hover:backdrop-blur-md"
                        }`}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* ================= RIGHT ================= */}
            <div className="hidden items-center gap-3 md:flex">
              {/* LIVE STATUS */}
              <div className="hidden items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-md xl:flex">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-xs font-bold tracking-wide text-white">
                  LIVE OPERATIONS
                </span>
              </div>
              {/* NOTIFICATION */}
              <button
                type="button"
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur-md transition hover:bg-white/20"
              >
                <BellIcon aria-hidden="true" className="h-5 w-5" />
                <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-red-600" />
              </button>
              {/* PROFILE */}
              <Menu as="div" className="relative">
                <MenuButton className="flex items-center gap-3 rounded-2xl bg-white/12 px-2 py-1.5 shadow-inner backdrop-blur-md transition hover:bg-white/20">
                  <img
                    alt=""
                    src={user.imageUrl}
                    className="h-9 w-9 rounded-2xl object-cover ring-2 ring-white/20"
                  />
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">{user.name}</p>
                    <p className="text-[10px] uppercase tracking-wide text-red-100">
                      Cashier
                    </p>
                  </div>
                </MenuButton>
                <MenuItems
                  transition
                  className="absolute right-0 z-20 mt-3 w-56 origin-top-right rounded-3xl border border-gray-100 bg-white p-2 shadow-[0_20px_60px_rgba(0,0,0,0.12)] outline-none transition data-closed:scale-95 data-closed:opacity-0"
                >
                  {userNavigation.map((item) => (
                    <MenuItem key={item.name}>
                      <button
                        onClick={() => {
                          if (item.name === "Sign out") {
                            dispatch(logout());
                            localStorage.clear();
                            navigate("/login");
                          }
                        }}
                        className="flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        {item.name}
                      </button>
                    </MenuItem>
                  ))}
                </MenuItems>
              </Menu>
            </div>
            {/* ================= MOBILE MENU ================= */}
            <div className="flex md:hidden">
              <DisclosureButton className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur-md transition hover:bg-white/20">
                <Bars3Icon
                  aria-hidden="true"
                  className="block h-6 w-6 group-data-open:hidden"
                />
                <XMarkIcon
                  aria-hidden="true"
                  className="hidden h-6 w-6 group-data-open:block"
                />
              </DisclosureButton>
            </div>
          </div>
        </div>
        {/* ================= MOBILE PANEL ================= */}
        <DisclosurePanel className="border-t border-white/10 bg-red-600/95 backdrop-blur-xl md:hidden">
          <div className="space-y-2 px-3 py-4">
            {navigation.map((item) => {
              const active = location.pathname === item.href;
              return (
                <DisclosureButton
                  key={item.name}
                  as={Link}
                  to={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    active
                      ? "bg-white text-red-600"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  {item.name}
                </DisclosureButton>
              );
            })}
          </div>
          {/* ================= MOBILE USER ================= */}
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3">
              <img
                alt=""
                src={user.imageUrl}
                className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/20"
              />
              <div>
                <p className="font-bold text-white">{user.name}</p>
                <p className="text-sm text-red-100">{user.email}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {userNavigation.map((item) => (
                <DisclosureButton
                  key={item.name}
                  as="button"
                  onClick={() => {
                    if (item.name === "Sign out") {
                      dispatch(logout());
                      localStorage.clear();
                      navigate("/login");
                    }
                  }}
                  className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {item.name}
                </DisclosureButton>
              ))}
            </div>
          </div>
        </DisclosurePanel>
      </Disclosure>
      {/* ================= PAGE ================= */}
      <main className="h-[calc(100vh-72px)] overflow-hidden">
        <div className="mx-auto h-full px-2 py-2 sm:px-3 sm:py-3 xl:px-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
