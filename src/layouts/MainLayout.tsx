import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { logout, setAuth } from "@/store/slices/authSlice";
import { useAppSelector } from "@/store/hooks";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { WifiOff, Bell, LogOut, User, CheckCircle } from "lucide-react";
import { getAllRunningOrders, updateRunningOrderStatus } from "@/services/runningOrderService";
import { getMyProfile } from "@/services/authService";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePolling } from "@/hooks/usePolling";
import { flushQueue, getQueueCount } from "@/utils/offlineQueue";
import { navFor, isKitchenDevice } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MainLayout() {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useAppSelector((state) => state.auth);
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const isOnline = useOnlineStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(getQueueCount());

  const isKitchen = isKitchenDevice(user);
  // Nav and route guards both read config/navigation.ts, so a visible tab is
  // always one this session can actually open.
  const navItems = navFor(user);

  // Poll READY orders for notification bell — non-kitchen users only
  const fetchReadyOrders = async () => {
    if (isKitchen || !user?.restaurantId || !user?.branchId) return;
    try {
      const res = await getAllRunningOrders(user.restaurantId, user.branchId);
      setReadyOrders((res.data || []).filter((o: any) => o.status === "READY"));
    } catch { /* silent */ }
  };
  useEffect(() => {
    fetchReadyOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isKitchen, user?.restaurantId, user?.branchId]);
  usePolling(fetchReadyOrders, 30000, [isKitchen, user?.restaurantId, user?.branchId]);

  // Periodically refresh this staff member's own profile so a branch/role
  // reassignment made on the owner dashboard takes effect without a manual
  // logout/login — the token's claims never change mid-session otherwise.
  usePolling(
    async () => {
      if (!token) return;
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
    },
    5 * 60 * 1000,
    [token, dispatch],
  );

  // Sync any orders queued while offline — on reconnect, and on a periodic
  // retry while online (in case a flush attempt itself failed mid-way).
  const authExpiredNoticeShown = useRef(false);
  const trySync = async () => {
    const before = getQueueCount();
    if (before === 0) return;
    const { synced, remaining, dropped, authExpired } = await flushQueue();
    setPendingSyncCount(remaining);
    if (synced > 0) {
      toast.success(`Synced ${synced} offline order${synced > 1 ? "s" : ""}`);
    }
    // Something the server permanently rejected (not just "still offline")
    // — surface it rather than let it silently vanish from the queue.
    dropped.forEach((d) => {
      toast.error(`Couldn't sync "${d.description}": ${d.reason}`, { duration: 8000 });
    });
    // Expired/invalid session — the queued items are kept (never dropped for
    // this reason), but syncing can't proceed without a fresh login. Shown
    // once per session rather than every 15s poll; never forces navigation
    // away from whatever the cashier is doing mid-shift.
    if (authExpired && !authExpiredNoticeShown.current) {
      authExpiredNoticeShown.current = true;
      toast("Session expired — sign in again to resume syncing your pending bills.", {
        icon: "🔒",
        duration: 10000,
      });
    }
  };
  useEffect(() => {
    if (!isOnline) {
      setPendingSyncCount(getQueueCount());
      return;
    }
    trySync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);
  usePolling(trySync, 15000, [isOnline]);

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
    // Only clear the auth session itself — never the offline queue, held
    // orders, offline bill-sequence counter, or saved printer config. A
    // cashier signing out (shift change, end of day) while bills/orders are
    // still queued unsynced must not destroy them; whoever logs in next on
    // this device picks the queue up right where it was left.
    localStorage.removeItem("persist:root");
    navigate("/login");
  };

  const initial = user?.name?.[0]?.toUpperCase() || "U";
  // A nav entry is active for its own path and anything nested under it, so
  // /app/shop/stock keeps the Shop tab lit.
  const isActive = (path: string) =>
    location.pathname === `/app/${path}` || location.pathname.startsWith(`/app/${path}/`);

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* ═══ TOP BAR ═══ */}
      <header className="shrink-0 z-40 bg-primary pad-safe-top shadow-sm">
        <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-4">
          {/* BRAND */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/25">
              <span className="text-sm font-bold text-white">D</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm leading-none font-bold tracking-tight">
                <span className="text-white">Dine</span>
                <span className="text-red-200">Ink</span>
              </p>
              <p className="mt-0.5 text-[0.5625rem] leading-none font-bold tracking-[0.15em] text-white/60 uppercase">
                {user?.branch?.name || "POS"}
              </p>
            </div>
          </div>

          {/* NAV — tablet and desktop. Phones use the bottom bar instead. */}
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={`/app/${item.path}`}
                  className={cn(
                    "flex h-10 items-center gap-1.5 rounded-control px-3 text-[0.8125rem] font-semibold transition-colors",
                    active ? "bg-white text-primary shadow-sm" : "text-white/85 hover:bg-white/15 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* RIGHT ACTIONS */}
          <div className="flex shrink-0 items-center gap-1.5">
            {/* CONNECTIVITY */}
            {isOnline ? (
              pendingSyncCount > 0 ? (
                <div className="flex h-9 items-center gap-1.5 rounded-control bg-amber-400/25 px-2.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-200" />
                  <span className="hidden text-[0.625rem] font-bold tracking-wider text-white uppercase sm:inline">
                    Syncing {pendingSyncCount}
                  </span>
                  <span className="text-[0.625rem] font-bold text-white tnum sm:hidden">{pendingSyncCount}</span>
                </div>
              ) : (
                <div className="flex h-9 items-center gap-1.5 rounded-control bg-white/12 px-2.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <span className="hidden text-[0.625rem] font-bold tracking-wider text-white uppercase sm:inline">
                    Live
                  </span>
                </div>
              )
            ) : (
              <div className="flex h-9 items-center gap-1.5 rounded-control bg-black/25 px-2.5">
                <WifiOff className="h-3.5 w-3.5 text-white" />
                <span className="text-[0.625rem] font-bold tracking-wider text-white uppercase">
                  Offline{pendingSyncCount > 0 ? ` · ${pendingSyncCount}` : ""}
                </span>
              </div>
            )}

            {/* NOTIFICATIONS — ready orders to run to a table */}
            {!isKitchen && (
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => setShowNotifications((v) => !v)}
                  aria-label={`Notifications${readyOrders.length ? ` (${readyOrders.length} ready)` : ""}`}
                  className="relative flex h-10 w-10 items-center justify-center rounded-control bg-white/15 text-white transition-colors hover:bg-white/25"
                >
                  <Bell className="h-4 w-4" />
                  {readyOrders.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[0.625rem] font-bold text-primary tnum ring-2 ring-primary">
                      {readyOrders.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-card border border-border bg-card shadow-xl">
                    <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                      <p className="text-sm font-bold text-foreground">Ready to serve</p>
                      {readyOrders.length > 0 && (
                        <span className="rounded-full bg-info-muted px-2 py-0.5 text-[0.625rem] font-bold text-info tnum">
                          {readyOrders.length}
                        </span>
                      )}
                    </div>
                    <div className="max-h-[60dvh] space-y-1.5 overflow-y-auto p-2">
                      {readyOrders.length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-center">
                          <CheckCircle className="h-7 w-7 text-border" />
                          <p className="mt-2 text-xs font-semibold text-muted-foreground">All orders delivered</p>
                        </div>
                      ) : (
                        readyOrders.map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between gap-2 rounded-control border border-info/25 bg-info-muted px-2.5 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-foreground">
                                {order.tableName ?? (order.tableId ? `Table ${order.tableId}` : "Takeaway")}
                              </p>
                              {order.orderNo && (
                                <p className="text-[0.625rem] text-muted-foreground">#{order.orderNo}</p>
                              )}
                            </div>
                            <Button size="xs" onClick={() => handleDeliverOrder(order)}>
                              Delivered
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PROFILE */}
            <Menu as="div" className="relative">
              <MenuButton className="flex h-10 w-10 items-center justify-center rounded-control bg-white/20 text-white ring-1 ring-white/20 transition-colors hover:bg-white/30">
                <span className="text-sm font-bold">{initial}</span>
              </MenuButton>
              <MenuItems className="absolute right-0 z-50 mt-2 w-52 rounded-card border border-border bg-card p-1.5 shadow-xl outline-none">
                <div className="flex items-center gap-2.5 px-2 py-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-red-50 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm leading-tight font-bold text-foreground">{user?.name || "Staff"}</p>
                    <p className="text-xs leading-tight text-muted-foreground capitalize">
                      {(user?.role || "cashier").toLowerCase()}
                      {isKitchen ? " · kitchen" : ""}
                    </p>
                  </div>
                </div>
                <div className="my-1 h-px bg-border" />
                <MenuItem>
                  <button
                    onClick={handleLogout}
                    className="flex h-11 w-full items-center gap-2 rounded-control px-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </div>
      </header>

      {/* ═══ PAGE ═══ */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* ═══ BOTTOM TABS — phone only ═══ */}
      {navItems.length > 1 && (
        <nav className="shrink-0 border-t border-border bg-card pad-safe-bottom md:hidden">
          <div className="flex">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={`/app/${item.path}`}
                  aria-current={active ? "page" : undefined}
                  className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-1.5"
                >
                  <span
                    className={cn(
                      "flex h-7 w-9 items-center justify-center rounded-lg transition-colors",
                      active && "bg-red-50",
                    )}
                  >
                    <Icon
                      className={cn("h-[1.125rem] w-[1.125rem]", active ? "text-primary" : "text-subtle-foreground")}
                      strokeWidth={active ? 2.5 : 2}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-[0.625rem] leading-none font-bold",
                      active ? "text-primary" : "text-subtle-foreground",
                    )}
                  >
                    {item.shortLabel ?? item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
