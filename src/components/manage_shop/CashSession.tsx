import { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { getCashSessions, openCashSession, closeCashSession } from "@/services/cashService";
import { Wallet, LockOpen, Lock, RefreshCw, AlertTriangle } from "lucide-react";

export default function CashSession() {
  const { user } = useAppSelector((state) => state.auth);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openSession, setOpenSession] = useState<any>(null);

  // Open form
  const [openingCash, setOpeningCash] = useState("");
  const [openNotes, setOpenNotes] = useState("");
  const [openLoading, setOpenLoading] = useState(false);

  // Close form
  const [actualCash, setActualCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);

  const fetchSessions = async () => {
    if (!user?.branchId) return;
    try {
      setLoading(true);
      const res = await getCashSessions(user.branchId);
      const all: any[] = res.data || [];
      setSessions(all);
      setOpenSession(all.find((s) => s.status === "OPEN") ?? null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleOpen = async () => {
    if (!user || !openingCash) return;
    try {
      setOpenLoading(true);
      await openCashSession({
        branchId:     user.branchId,
        restaurantId: user.restaurantId,
        openedById:   user.id,
        openingCash:  Number(openingCash),
        notes:        openNotes || undefined,
      });
      setOpeningCash("");
      setOpenNotes("");
      await fetchSessions();
    } catch (err) {
      console.error(err);
    } finally {
      setOpenLoading(false);
    }
  };

  const handleClose = async () => {
    if (!openSession || !actualCash || !user) return;
    try {
      setCloseLoading(true);
      await closeCashSession(openSession.id, {
        closedById:  user.id,
        actualCash:  Number(actualCash),
        closingCash: Number(actualCash),
        notes:       closeNotes || undefined,
      });
      setActualCash("");
      setCloseNotes("");
      await fetchSessions();
    } catch (err) {
      console.error(err);
    } finally {
      setCloseLoading(false);
    }
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Counter Cash</p>
            <p className="text-[10px] text-gray-500">{today}</p>
          </div>
        </div>
        <button onClick={fetchSessions} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-red-500">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Current session status */}
      {openSession ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-bold text-emerald-700">Session Open</p>
            <span className="ml-auto text-[10px] text-emerald-600">
              {new Date(openSession.openedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white border border-emerald-100 px-3 py-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Opening Cash</p>
              <p className="text-sm font-black text-gray-900">₹{Number(openSession.openingCash).toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-white border border-emerald-100 px-3 py-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Opened By</p>
              <p className="text-sm font-bold text-gray-900 truncate">{openSession.openedBy?.name ?? "—"}</p>
            </div>
          </div>

          {/* Close session form */}
          <div className="space-y-2 pt-1 border-t border-emerald-200">
            <p className="text-[11px] font-bold text-gray-700">Close Session</p>
            <input
              type="number"
              placeholder="Actual cash in drawer (₹)"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100"
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100"
            />
            {actualCash && openSession.expectedCash > 0 && (
              <div className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                Number(actualCash) >= openSession.expectedCash
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Expected ₹{Number(openSession.expectedCash).toLocaleString()} · Difference: ₹{(Number(actualCash) - openSession.expectedCash).toLocaleString()}
              </div>
            )}
            <button
              onClick={handleClose}
              disabled={!actualCash || closeLoading}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              <Lock className="h-3 w-3" />
              {closeLoading ? "Closing..." : "Close Session"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <p className="text-xs font-bold text-gray-500">No Open Session</p>
          </div>
          <p className="text-[11px] text-gray-400">Open a session to start tracking counter cash for today.</p>
          <div className="space-y-2">
            <input
              type="number"
              placeholder="Opening cash amount (₹)"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100"
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100"
            />
            <button
              onClick={handleOpen}
              disabled={!openingCash || openLoading}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              <LockOpen className="h-3 w-3" />
              {openLoading ? "Opening..." : "Open Session"}
            </button>
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Recent Sessions</p>
          <div className="space-y-1.5">
            {sessions.slice(0, 5).map((s) => {
              const diff = s.cashDifference ?? 0;
              return (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">
                      {new Date(s.businessDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Open ₹{Number(s.openingCash).toLocaleString()} → Close ₹{Number(s.closingCash).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      s.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {s.status}
                    </span>
                    {s.status === "CLOSED" && (
                      <p className={`text-[10px] font-bold ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {diff >= 0 ? "+" : ""}₹{diff.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
