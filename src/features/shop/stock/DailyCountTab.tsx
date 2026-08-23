import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Search, Save, RotateCcw, ClipboardCheck } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { getDailyAuditPreview, saveDailyAudit, type AuditRow } from "@/services/stockService";
import { Button } from "@/components/ui/button";
import { TextInput, NumberInput, SelectInput } from "@/components/ui/field";
import { Banner, ScreenFooter, StatTile } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

/**
 * End-of-day physical count. Previously owner-web only, which meant the owner
 * was doing (or chasing) data entry for a task performed with a clipboard in
 * the store.
 *
 * Two decisions carry this screen:
 *
 * 1. Every Actual is PRE-FILLED with Expected. With 200+ ingredients, asking
 *    staff to type every closing quantity from scratch guarantees the count
 *    either doesn't happen or gets invented. Pre-filling means they only touch
 *    the rows where the shelf disagrees with the system; an untouched row saves
 *    as "matched expectation, no wastage", which is what an uneventful count
 *    genuinely looks like.
 *
 * 2. Rows are FILTERABLE down to just the edited ones. The save posts all rows
 *    regardless — a count is only meaningful as a complete snapshot — but on a
 *    phone the person needs to be able to see what they've actually changed
 *    before committing it.
 */

const todayIso = () => {
  const d = new Date();
  // Local calendar date, not toISOString(), which would roll a late-evening
  // count in IST onto the previous UTC day and file it against yesterday.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const round3 = (n: number) => Math.round(n * 1000) / 1000;

type Filter = "all" | "edited" | "variance";

export default function DailyCountTab() {
  const { user } = useAppSelector((s) => s.auth);
  // restaurantId is intentionally not read here — the save endpoint takes it
  // from the auth token rather than the body.
  const branchId = user?.branchId;

  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  /** ingredientId → what the counter typed. Absent = untouched (uses expected). */
  const [counted, setCounted] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await getDailyAuditPreview(branchId, date);
      const data: AuditRow[] = res.data || [];
      setRows(data);
      // An already-saved date shows what was actually recorded; an unsaved one
      // starts from Expected. Both are seeded here so "edited" can be detected
      // as a genuine change against the right baseline.
      const seeded: Record<number, string> = {};
      const seededNotes: Record<number, string> = {};
      data.forEach((r) => {
        seeded[r.ingredientId] = String(r.closingQty ?? r.expectedClosing ?? 0);
        if (r.notes) seededNotes[r.ingredientId] = r.notes;
      });
      setCounted(seeded);
      setNotes(seededNotes);
    } catch {
      toast.error("Couldn't load the stock count — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [branchId, date]);

  useEffect(() => {
    load();
  }, [load]);

  const baselineFor = (r: AuditRow) => r.closingQty ?? r.expectedClosing ?? 0;

  const varianceFor = (r: AuditRow): number => {
    const actual = Number(counted[r.ingredientId] ?? baselineFor(r));
    // Same formula the server applies: positive = more consumed than the
    // recipes account for, i.e. wastage.
    return round3(r.expectedClosing - (Number.isFinite(actual) ? actual : 0));
  };

  const isEdited = (r: AuditRow) =>
    Number(counted[r.ingredientId] ?? baselineFor(r)) !== baselineFor(r) ||
    (notes[r.ingredientId] || "") !== (r.notes || "");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (filter === "edited" && !isEdited(r)) return false;
      if (filter === "variance" && Math.abs(varianceFor(r)) < 0.001) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, filter, counted, notes]);

  const editedCount = useMemo(() => rows.filter(isEdited).length, [rows, counted, notes]);
  const alreadySaved = rows.length > 0 && rows.every((r) => r.auditSaved);
  const wastageValue = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const v = varianceFor(r);
        return sum + (v > 0 ? v * (r.pricePerUnit || 0) : 0);
      }, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, counted],
  );

  const handleSave = async () => {
    if (!branchId || rows.length === 0) return;
    setSaving(true);
    try {
      const res = await saveDailyAudit({
        branchId,
        date,
        // Every row, not just the edited ones — a partial count would leave
        // yesterday's closing as today's opening for the missing items and
        // silently corrupt tomorrow's expected figures.
        entries: rows.map((r) => {
          const actual = Number(counted[r.ingredientId] ?? baselineFor(r));
          return {
            ingredientId: r.ingredientId,
            closingQty: Number.isFinite(actual) ? actual : 0,
            openingQty: r.openingQty,
            sopConsumed: r.sopConsumed,
            notes: notes[r.ingredientId] || undefined,
          };
        }),
      });
      if (res?.queuedOffline) {
        toast("No connection — count saved offline, it'll sync automatically.", { icon: "📴", duration: 5000 });
      } else {
        toast.success(`Stock count saved for ${date}`);
        await load();
      }
    } catch {
      toast.error("Couldn't save the count — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetToExpected = () => {
    const seeded: Record<number, string> = {};
    rows.forEach((r) => (seeded[r.ingredientId] = String(r.expectedClosing ?? 0)));
    setCounted(seeded);
    toast("All rows reset to the expected figure.", { icon: "↩️" });
  };

  if (!branchId) {
    return <Banner tone="warning" title="No branch selected">This account isn't linked to a branch, so there's nothing to count.</Banner>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* Controls */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="col-span-1 flex flex-col gap-1">
              <span className="text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase">Date</span>
              <TextInput type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="col-span-1 flex flex-col gap-1">
              <span className="text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase">Show</span>
              <SelectInput value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
                <option value="all">All items</option>
                <option value="edited">Only edited</option>
                <option value="variance">Only with variance</option>
              </SelectInput>
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase">Search</span>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                <TextInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find an ingredient…"
                  className="pl-9"
                />
              </div>
            </label>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Items" value={rows.length} sub={`${visible.length} shown`} />
            <StatTile label="Edited" value={editedCount} tone={editedCount > 0 ? "info" : "default"} sub="rows you changed" />
            <StatTile
              label="Wastage value"
              value={`₹${Math.round(wastageValue).toLocaleString("en-IN")}`}
              tone={wastageValue > 0 ? "warning" : "success"}
              sub="at cost, this count"
            />
            <StatTile
              label="Status"
              value={alreadySaved ? "Counted" : "Open"}
              tone={alreadySaved ? "success" : "warning"}
              sub={alreadySaved ? "saved for this date" : "not yet saved"}
            />
          </div>

          <Banner tone="info" icon={<ClipboardCheck className="h-4 w-4" />}>
            <strong>Actual</strong> is pre-filled with what the system expects. Only change the rows where your
            physical count differs — anything you leave alone saves as “matched expectation, no wastage”.
          </Banner>

          {/* Rows */}
          {loading && rows.length === 0 ? (
            <div className="py-10">
              <LoadingIndicator variant="section" label="Loading the day's stock…" />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<span className="text-2xl">📦</span>}
              title={search || filter !== "all" ? "Nothing matches this filter" : "No ingredients to count"}
              className="py-14"
            />
          ) : (
            <>
              {/* Cards — phone and tablet */}
              <div className="flex flex-col gap-2 xl:hidden">
                {visible.map((r) => {
                  const variance = varianceFor(r);
                  const edited = isEdited(r);
                  return (
                    <div
                      key={r.ingredientId}
                      className={cn(
                        "rounded-card border bg-card p-3",
                        edited ? "border-primary/40 ring-1 ring-primary/15" : "border-border",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{r.name}</p>
                          <p className="text-[0.6875rem] text-muted-foreground">
                            Opening {r.openingQty} · Used {r.sopConsumed} {r.unit}
                          </p>
                        </div>
                        {Math.abs(variance) >= 0.001 && (
                          <StatusBadge
                            tone={variance > 0 ? "bg-warning-muted text-warning" : "bg-info-muted text-info"}
                            size="md"
                          >
                            {variance > 0 ? `−${variance}` : `+${Math.abs(variance)}`} {r.unit}
                          </StatusBadge>
                        )}
                      </div>

                      <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-border pt-2.5">
                        <div>
                          <p className="text-[0.625rem] font-bold tracking-wide text-subtle-foreground uppercase">
                            Expected
                          </p>
                          <p className="text-sm font-semibold text-muted-foreground tnum">
                            {r.expectedClosing} {r.unit}
                          </p>
                        </div>
                        <label className="flex flex-col gap-1">
                          <span className="text-[0.625rem] font-bold tracking-wide text-subtle-foreground uppercase">
                            Actual count
                          </span>
                          <NumberInput
                            step="any"
                            min="0"
                            value={counted[r.ingredientId] ?? ""}
                            onChange={(e) =>
                              setCounted((p) => ({ ...p, [r.ingredientId]: e.target.value }))
                            }
                            className="h-11 font-bold"
                          />
                        </label>
                      </div>

                      {(edited || notes[r.ingredientId]) && (
                        <TextInput
                          value={notes[r.ingredientId] || ""}
                          onChange={(e) => setNotes((p) => ({ ...p, [r.ingredientId]: e.target.value }))}
                          placeholder="Why the difference? (optional)"
                          className="mt-2 h-10 text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Table — desktop */}
              <div className="hidden overflow-x-auto rounded-card border border-border bg-card xl:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/60 text-left">
                      {["Ingredient", "Opening", "Used", "Expected", "Actual count", "Variance", "Note"].map((h, i) => (
                        <th
                          key={h}
                          className={cn(
                            "px-3 py-2.5 text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase whitespace-nowrap",
                            i > 0 && i < 6 && "text-right",
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => {
                      const variance = varianceFor(r);
                      const edited = isEdited(r);
                      return (
                        <tr
                          key={r.ingredientId}
                          className={cn("border-b border-border last:border-0", edited && "bg-red-50/50")}
                        >
                          <td className="px-3 py-2 text-sm font-semibold text-foreground">
                            {r.name}
                            <span className="ml-1 text-xs font-normal text-subtle-foreground">{r.unit}</span>
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-muted-foreground tnum">{r.openingQty}</td>
                          <td className="px-3 py-2 text-right text-sm text-muted-foreground tnum">{r.sopConsumed}</td>
                          <td className="px-3 py-2 text-right text-sm font-semibold text-muted-foreground tnum">
                            {r.expectedClosing}
                          </td>
                          <td className="px-3 py-2">
                            <NumberInput
                              step="any"
                              min="0"
                              value={counted[r.ingredientId] ?? ""}
                              onChange={(e) => setCounted((p) => ({ ...p, [r.ingredientId]: e.target.value }))}
                              className="ml-auto h-10 w-28 text-right font-bold"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            {Math.abs(variance) < 0.001 ? (
                              <span className="text-sm text-subtle-foreground">—</span>
                            ) : (
                              <span
                                className={cn(
                                  "text-sm font-bold tnum",
                                  variance > 0 ? "text-warning" : "text-info",
                                )}
                              >
                                {variance > 0 ? `−${variance}` : `+${Math.abs(variance)}`}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <TextInput
                              value={notes[r.ingredientId] || ""}
                              onChange={(e) => setNotes((p) => ({ ...p, [r.ingredientId]: e.target.value }))}
                              placeholder="Optional"
                              className="h-10 min-w-40 text-sm"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <ScreenFooter>
        <Button variant="outline" onClick={resetToExpected} disabled={saving || rows.length === 0}>
          <RotateCcw />
          Reset to expected
        </Button>
        <Button onClick={handleSave} disabled={saving || rows.length === 0}>
          <Save />
          {saving ? "Saving…" : alreadySaved ? `Update count (${rows.length})` : `Save count (${rows.length})`}
        </Button>
      </ScreenFooter>
    </div>
  );
}
