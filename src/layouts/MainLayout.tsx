import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout, setAuth } from "@/store/slices/authSlice";
import { useAppSelector } from "@/store/hooks";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Receipt, ClipboardList, Wifi, Store, Bell, LogOut, User, ChefHat, CheckCircle } from "lucide-react";
import { getAllRunningOrders, updateRunningOrderStatus } from "@/services/runningOrderService";
import { getMyProfile } from "@/services/authService";

export default function MainLayout() {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useAppSelector((state) => state.auth);
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const isKitchen = user?.department === "KITCHEN";
  const role = user?.role;

  const navItems = isKitchen
    ? [{ name: "Kitchen", href: "/app/kitchen", icon: ChefHat }]
    : role === "MANAGER"
      ? [
          { name: "Billing", href: "/app/billing", icon: Receipt },
          { name: "Orders", href: "/app/orders", icon: ClipboardList },
          { name: "Online", href: "/app/online-orders", icon: Wifi },
          { name: "Kitchen", href: "/app/kitchen", icon: ChefHat },
          { name: "Shop", href: "/app/manage-shop", icon: Store },
        ]
      : role === "CASHIER"
        ? [
            { name: "Billing", href: "/app/billing", icon: Receipt },
            { name: "Orders", href: "/app/orders", icon: ClipboardList },
            { name: "Online", href: "/app/online-orders", icon: Wifi },
          ]
        : [{ name: "Billing", href: "/app/billing", icon: Receipt }];

  // Poll READY orders for notification bell — non-kitchen users only
  useEffect(() => {
    if (isKitchen || !user?.restaurantId || !user?.branchId) return;
    const fetch = async () => {
      try {
        const res = await getAllRunningOrders(user.restaurantId, user.branchId);
        setReadyOrders((res.data || []).filter((o: any) => o.status === "READY"));
      } catch { /* silent */ }
    };
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, [isKitchen, user?.restaurantId, user?.branchId]);

  // Periodically refresh this staff member's own profile so a branch/role
  // reassignment made on the owner dashboard takes effect without a manual
  // logout/login — the token's claims never change mid-session otherwise.
  useEffect(() => {
    if (!token) return;
    const refreshProfile = async () => {
      try {
        const res = await getMyProfile();
        if (res.success && res.data) {
          dispatch(
            setAuth({
              token,
              user: res.data,
              restaurant: res.data.restaurant,
              branch: res.data.branch,
            }),
          );
        }
      } catch { /* silent */ }
    };
    const id = setInterval(refreshProfile, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [token, dispatch]);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleDeliverOrder = async (order: any) => {
    try {
      await updateRunningOrderStatus(order.id, "DELIVERED");
      setReadyOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch { /* silent */ }
  };

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
              <p className="text-[7px] font-bold uppercase tracking-widest text-red-100/70 leading-none">POS</p>
            </div>
          </div>

          {/* DESKTOP NAV LINKS */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const active = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.name} to={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    active ? "bg-white text-red-600 shadow-sm" : "text-red-50/90 hover:bg-white/15 hover:text-white"
                  }`}>
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
              <span className="text-[9px] font-bold tracking-widest text-white uppercase">Live</span>
            </div>

            {/* NOTIFICATION BELL */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"
              >
                <Bell className="h-3.5 w-3.5" />
                {readyOrders.length > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[8px] font-black text-white ring-1 ring-red-500 animate-pulse">
                    {readyOrders.length}
                  </span>
                ) : (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-400 ring-1 ring-red-500" />
                )}
              </button>

              {/* NOTIFICATION DROPDOWN */}
              {showNotifications && (
                <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-gray-100 bg-white shadow-xl z-50 overflow-hidden">
                  <div className="border-b border-gray-100 px-3 py-2 flex items-center justify-between">
                    <p className="text-xs font-black text-gray-900">Notifications</p>
                    {readyOrders.length > 0 && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black text-blue-700">
                        {readyOrders.length} ready
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2 space-y-1.5">
                    {readyOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <CheckCircle className="h-6 w-6 text-gray-200" />
                        <p className="mt-2 text-xs font-semibold text-gray-400">All orders delivered</p>
                      </div>
                    ) : (
                      readyOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-2">
                          <div>
                            <p className="text-xs font-black text-gray-900">
                              {order.tableName ?? (order.tableId ? `Table ${order.tableId}` : "Takeaway")}
                            </p>
                            <p className="text-[10px] text-blue-600 font-semibold">Ready to serve</p>
                            {order.orderNo && (
                              <p className="text-[9px] text-gray-400">#{order.orderNo}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeliverOrder(order)}
                            className="ml-2 shrink-0 rounded-lg bg-blue-500 px-2.5 py-1.5 text-[10px] font-black text-white transition hover:bg-blue-600 active:scale-95"
                          >
                            Delivered
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
                    <p className="text-xs font-bold text-gray-900 leading-tight">{user?.name || "Staff"}</p>
                    <p className="text-[10px] text-gray-500 capitalize leading-tight">{user?.role || "Cashier"}</p>
                  </div>
                </div>
                <div className="h-px bg-gray-100 mb-0.5" />
                <MenuItem>
                  <button onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50">
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
              <Link key={item.name} to={item.href}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5">
                <div className={`flex h-7 w-8 items-center justify-center rounded-lg transition-all ${active ? "bg-red-50" : ""}`}>
                  <Icon className={`h-[18px] w-[18px] transition-colors ${active ? "text-red-600" : "text-gray-400"}`}
                    strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className={`text-[9px] font-bold leading-none ${active ? "text-red-600" : "text-gray-400"}`}>
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
