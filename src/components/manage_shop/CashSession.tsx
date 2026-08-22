import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";
import {
  getCashSessions,
  openCashSession,
  closeCashSession,
  getShiftSalesSummary,
} from "@/services/cashService";
import { Wallet, LockOpen, Lock, RefreshCw, AlertTriangle, Receipt, Printer, Users } from "lucide-react";
import { formatCurrency, formatLongDate, formatTime } from "@/utils/format";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);

  // Other cashiers' currently-open sessions on this branch — informational
  // only (each cashier only opens/closes/sees their own drawer).
  const otherOpenSessions = sessions.filter(
    (s) => s.status === "OPEN" && s.openedById !== user?.id,
  );

  // Live preview of expected cash while the session is still open —
  // openSession.expectedCash is a DB column that's only populated at close
  // time (0 until then), so it can't be used for a pre-close preview.
  const liveShiftCash = shiftSummary?.paymentBreakdown?.find(
    (p: any) => p.method === "CASH",
  )?.amount || 0;
  const liveExpectedCash = Number(openSession?.openingCash || 0) + Number(liveShiftCash);

  const fetchSessions = async () => {
    if (!user?.branchId) return;
    try {
      setLoading(true);
      const res = await getCashSessions(user.branchId);
      const all: any[] = res.data || [];
      setSessions(all);
      // A branch can have several cashiers with concurrent open sessions —
      // each only sees and reconciles their own drawer, not anyone else's.
      setOpenSession(all.find((s) => s.status === "OPEN" && s.openedById === user?.id) ?? null);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't load cash sessions — check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user?.branchId]);

  // Shift sales summary — shown alongside the cash reconciliation so closing
  // a session isn't just "does the drawer match" with no visibility into
  // what the shift actually sold. Scoped to THIS session's own open→now
  // window server-side, not the whole business day.
  useEffect(() => {
    // A queued-offline session has no real ID yet — nothing to summarize
    // server-side until it syncs.
    if (!openSession?.id) {
      setShiftSummary(null);
      return;
    }
    getShiftSalesSummary(openSession.id)
      .then((res) => setShiftSummary(res.success ? res.data : null))
      .catch(() => setShiftSummary(null));
  }, [openSession]);

  const handleOpen = async () => {
    if (!user || !openingCash) return;
    try {
      setOpenLoading(true);
      const res = await openCashSession({
        branchId:     user.branchId,
        restaurantId: user.restaurantId,
        openedById:   user.id,
        openingCash:  Number(openingCash),
        notes:        openNotes || undefined,
      });
      setOpeningCash("");
      setOpenNotes("");
      if (res?.queuedOffline) {
        // No connection — show the session as open locally right away (the
        // cashier needs to keep taking cash) using a placeholder with no
        // real ID yet; it'll sync automatically and a manual refresh once
        // reconnected picks up the real, closeable record.
        toast("No connection — cash session opened offline, will sync automatically.", { icon: "📴", duration: 5000 });
        setOpenSession({
          openedAt: new Date().toISOString(),
          openedBy: { name: user.name },
          openingCash: Number(openingCash),
          openedById: user.id,
          status: "OPEN",
          queuedOffline: true,
        });
      } else {
        await fetchSessions();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't open a cash session.");
    } finally {
      setOpenLoading(false);
    }
  };

  const handleClose = async () => {
    if (!openSession || !actualCash || !user) return;
    try {
      setCloseLoading(true);
      setConfirmingClose(false);
      // Preview of expected cash for the receipt/print — the server
      // recomputes this authoritatively from THIS session's own bills.
      const expectedCash = liveExpectedCash;
      const actual = Number(actualCash);
      await closeCashSession(openSession.id, {
        closedById:  user.id,
        actualCash:  actual,
        closingCash: expectedCash,
        notes:       closeNotes || undefined,
      });
      // Print the Z-report (final shift summary) using the numbers just
      // submitted, before resetting the form clears them.
      printShiftSummary({
        isFinal: true,
        openedAt: openSession.openedAt,
        openedByName: openSession.openedBy?.name,
        openingCash: openSession.openingCash,
        expectedCash,
        actualCash: actual,
        notes: closeNotes,
        shiftSummary,
      });
      setActualCash("");
      setCloseNotes("");
      await fetchSessions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't close this cash session.");
    } finally {
      setCloseLoading(false);
    }
  };

  // X-report (mid-shift, session still open) or Z-report (final, at close) —
  // a physical summary staff can hand over or file, since the on-screen
  // summary alone disappears once the shift ends.
  const printShiftSummary = (data: {
    isFinal: boolean;
    openedAt: string;
    openedByName?: string;
    openingCash: number;
    expectedCash?: number;
    actualCash?: number;
    notes?: string;
    shiftSummary: any;
  }) => {
    const pw = window.open("", "", "width=400,height=600");
    if (!pw) return;
    const diff = data.actualCash != null && data.expectedCash != null
      ? data.actualCash - data.expectedCash
      : null;
    const payRows = (data.shiftSummary?.paymentBreakdown || [])
      .map((p: any) => `<tr><td>${p.method}</td><td style="text-align:right">${formatCurrency(p.amount)}</td><td style="text-align:right">${p.count}</td></tr>`)
      .join("");
    pw.document.write(`<html><head><title>${data.isFinal ? "Z-Report" : "X-Report"}</title>
<style>
@page{size:80mm auto;margin:0}
body{margin:0;padding:4px;font-family:monospace;color:black;background:white;font-size:12px}
.c{text-align:center}.d{border-top:1px dashed black;margin:6px 0}
table{width:100%;border-collapse:collapse}
td{padding:2px 0;vertical-align:top}
</style></head>
<body onload="window.print();window.close();">
<div class="c" style="margin-bottom:4px">
  <div style="font-size:10px;font-weight:bold;letter-spacing:2px">${data.isFinal ? "Z-REPORT — SHIFT CLOSE" : "X-REPORT — SHIFT IN PROGRESS"}</div>
  <div style="font-size:16px;font-weight:bold;margin-top:2px">${user?.restaurant?.name || user?.branch?.name || "DineInk"}</div>
</div>
<div class="d"></div>
<table>
  <tr><td>Opened</td><td style="text-align:right">${new Date(data.openedAt).toLocaleString("en-IN")}</td></tr>
  <tr><td>Opened By</td><td style="text-align:right">${data.openedByName || "-"}</td></tr>
  ${data.isFinal ? `<tr><td>Closed</td><td style="text-align:right">${new Date().toLocaleString("en-IN")}</td></tr>` : ""}
</table>
<div class="d"></div>
<table>
  <tr><td>Opening Cash</td><td style="text-align:right">${formatCurrency(data.openingCash)}</td></tr>
  ${data.expectedCash != null ? `<tr><td>Expected Cash</td><td style="text-align:right">${formatCurrency(data.expectedCash)}</td></tr>` : ""}
  ${data.actualCash != null ? `<tr><td>Actual Cash</td><td style="text-align:right">${formatCurrency(data.actualCash)}</td></tr>` : ""}
  ${diff != null ? `<tr><td><b>Difference</b></td><td style="text-align:right"><b>${diff >= 0 ? "+" : ""}${formatCurrency(diff)}</b></td></tr>` : ""}
</table>
${data.shiftSummary ? `<div class="d"></div>
<table>
  <tr><td>Total Revenue</td><td style="text-align:right">${formatCurrency(data.shiftSummary.totalRevenue)}</td></tr>
  <tr><td>Bills</td><td style="text-align:right">${data.shiftSummary.billCount}</td></tr>
  <tr><td>Avg Bill</td><td style="text-align:right">${formatCurrency(Math.round(data.shiftSummary.avgBillValue))}</td></tr>
</table>
${payRows ? `<div class="d"></div><table><tr><td><b>Payment</b></td><td style="text-align:right"><b>Amount</b></td><td style="text-align:right"><b>#</b></td></tr>${payRows}</table>` : ""}` : ""}
${data.notes ? `<div class="d"></div><div>Notes: ${data.notes}</div>` : ""}
<div class="d"></div>
<div class="c" style="font-size:10px;font-weight:bold">*** ${data.isFinal ? "END OF SHIFT" : "SHIFT STILL OPEN"} ***</div>
</body></html>`);
    pw.document.close();
  };

  const today = formatLongDate(new Date());

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight text-gray-900">Counter Cash</p>
            <p className="text-[10px] text-gray-500">{today}</p>
          </div>
        </div>
        <button
          onClick={fetchSessions}
          aria-label="Refresh sessions"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-red-500"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Other cashiers' open sessions — each till is separate, this is informational */}
      {otherOpenSessions.length > 0 && (
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
          <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <p className="text-[11px] font-semibold text-blue-700">
            {otherOpenSessions.map((s) => s.openedBy?.name || "Someone").join(", ")}
            {otherOpenSessions.length > 1 ? " also have" : " also has"} an open drawer right now.
          </p>
        </div>
      )}

      {/* Current session status */}
      {openSession ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-bold text-emerald-700">Session Open</p>
            <span className="text-[10px] text-emerald-600">
              {formatTime(openSession.openedAt)}
            </span>
            <button
              onClick={() => printShiftSummary({
                isFinal: false,
                openedAt: openSession.openedAt,
                openedByName: openSession.openedBy?.name,
                openingCash: openSession.openingCash,
                expectedCash: liveExpectedCash,
                shiftSummary,
              })}
              title="Print X-Report (mid-shift summary)"
              aria-label="Print X-Report"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-100"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white border border-emerald-100 px-3 py-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Opening Cash</p>
              <p className="text-sm font-black text-gray-900">{formatCurrency(openSession.openingCash)}</p>
            </div>
            <div className="rounded-lg bg-white border border-emerald-100 px-3 py-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Opened By</p>
              <p className="text-sm font-bold text-gray-900 truncate">{openSession.openedBy?.name ?? "—"}</p>
            </div>
          </div>

          {/* Shift sales summary */}
          {shiftSummary && (
            <div className="rounded-lg border border-emerald-100 bg-white p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                <p className="text-[11px] font-bold text-gray-700">Today's Sales</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wide">Revenue</p>
                  <p className="text-sm font-black text-gray-900">
                    {formatCurrency(shiftSummary.totalRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wide">Bills</p>
                  <p className="text-sm font-black text-gray-900">{shiftSummary.billCount}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wide">Avg Bill</p>
                  <p className="text-sm font-black text-gray-900">
                    {formatCurrency(shiftSummary.avgBillValue)}
                  </p>
                </div>
              </div>
              {shiftSummary.paymentBreakdown?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t border-gray-100 pt-2">
                  {shiftSummary.paymentBreakdown.map((p: any) => (
                    <span
                      key={p.method}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-600"
                    >
                      {p.method}: {formatCurrency(p.amount)} ({p.count})
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Close session form */}
          <div className="space-y-2 pt-1 border-t border-emerald-200">
            <p className="text-[11px] font-bold text-gray-700">Close Session</p>
            {openSession?.queuedOffline && (
              <p className="text-[10px] font-semibold text-amber-600">
                This session hasn't synced yet — it can be closed once it does.
              </p>
            )}
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
            {actualCash && liveExpectedCash > 0 && (
              <div className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                Number(actualCash) >= liveExpectedCash
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Expected {formatCurrency(liveExpectedCash)} · Difference: {formatCurrency(Number(actualCash) - liveExpectedCash)}
              </div>
            )}
            <button
              onClick={() => setConfirmingClose(true)}
              disabled={!actualCash || closeLoading || !openSession?.id}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-500 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40"
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
                      Open {formatCurrency(s.openingCash)} → Close {formatCurrency(s.closingCash)}
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
                        {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CLOSE SESSION CONFIRM MODAL */}
      <ConfirmDialog
        open={confirmingClose}
        title="Close this cash session?"
        description="This locks the drawer for today and prints the Z-report. It cannot be reopened."
        confirmLabel={closeLoading ? "Closing…" : "Close Session"}
        onConfirm={handleClose}
        onCancel={() => setConfirmingClose(false)}
        confirmDisabled={closeLoading}
      >
        <div className="mt-3 space-y-1 rounded-lg bg-gray-50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Expected</span>
            <span className="font-bold text-gray-800">{formatCurrency(liveExpectedCash)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Actual (entered)</span>
            <span className="font-bold text-gray-800">{formatCurrency(Number(actualCash) || 0)}</span>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
