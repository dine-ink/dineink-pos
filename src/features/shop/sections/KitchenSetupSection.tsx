import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Flame, Timer, Wrench, ListChecks, Plus, Wand2, Trash2, Pencil } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import {
  assignEquipmentToStation,
  createStation,
  getStations,
  seedStandardsFromPrepTime,
  seedStations,
  updateStation,
} from "@/services/laborService";
import { getEquipment, updateEquipment, getSopChecklists, createSopChecklist, deleteSopChecklist } from "@/services/facilityService";
import { SegmentedTabs, SectionCard, Banner, StatTile } from "@/components/ui/page";
import { RecordList, type RecordColumn } from "@/components/ui/record-list";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, FieldGrid, TextInput, NumberInput, TextArea, ToggleRow } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Kitchen configuration — the data the order-taking ETA depends on, plus the
 * equipment and checklist screens.
 *
 * Order matters here and the UI says so: without stations there are no labor
 * standards, and without either the ETA can't quote anything and correctly
 * refuses to guess. Each tab tells the manager what's still missing rather than
 * showing a confident empty state.
 */

type Tab = "stations" | "times" | "equipment" | "checklists";

export default function KitchenSetupSection() {
  const [tab, setTab] = useState<Tab>("stations");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SegmentedTabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "stations", label: "Stations", icon: <Flame className="h-3.5 w-3.5" /> },
          { id: "times", label: "Prep times", icon: <Timer className="h-3.5 w-3.5" /> },
          { id: "equipment", label: "Equipment", icon: <Wrench className="h-3.5 w-3.5" /> },
          { id: "checklists", label: "Checklists", icon: <ListChecks className="h-3.5 w-3.5" /> },
        ]}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tab === "stations" && <StationsTab />}
        {tab === "times" && <PrepTimesTab />}
        {tab === "equipment" && <EquipmentTab />}
        {tab === "checklists" && <ChecklistsTab />}
      </div>
    </div>
  );
}

/* ── Stations ────────────────────────────────────────────────────────────── */

function StationsTab() {
  const { user } = useAppSelector((s) => s.auth);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", capacityPerHour: "" });

  const load = useCallback(async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    setLoading(true);
    try {
      const res = await getStations(user.restaurantId, user.branchId);
      setRows(res.data ?? []);
    } catch {
      toast.error("Couldn't load stations — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId, user?.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const doSeed = async () => {
    if (!user?.branchId) return;
    setSaving(true);
    try {
      await seedStations(user.branchId);
      toast.success("Standard stations created — rename or remove any you don't have.");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't create the stations.");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!user?.branchId) return;
    if (!form.name.trim()) {
      toast.error("A station name is required.");
      return;
    }
    setSaving(true);
    try {
      const capacity = form.capacityPerHour === "" ? null : Number(form.capacityPerHour);
      if (editing) {
        await updateStation(editing.stationId, { name: form.name.trim(), capacityPerHour: capacity });
      } else {
        await createStation({
          branchId: user.branchId,
          name: form.name.trim(),
          code: (form.code || form.name).trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
          capacityPerHour: capacity,
        });
      }
      toast.success(editing ? "Station updated" : "Station added");
      setOpen(false);
      setEditing(null);
      setForm({ name: "", code: "", capacityPerHour: "" });
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't save the station.");
    } finally {
      setSaving(false);
    }
  };

  const columns: RecordColumn<any>[] = [
    { key: "name", header: "Station", role: "primary", render: (r) => r.name },
    { key: "code", header: "Code", role: "secondary", render: (r) => r.code },
    {
      key: "capacity",
      header: "Items / hour",
      role: "numeric",
      render: (r) =>
        r.capacityPerHour ?? r.equipmentItemsPerHour ?? (
          <span className="text-subtle-foreground">not set</span>
        ),
    },
    { key: "standards", header: "Items timed", role: "numeric", render: (r) => r.standardsCount },
    {
      key: "ready",
      header: "State",
      role: "meta",
      render: (r) =>
        r.standardsCount > 0 ? (
          <StatusBadge size="md" tone="bg-success-muted text-success">
            Feeding estimates
          </StatusBadge>
        ) : (
          <StatusBadge size="md" tone="bg-warning-muted text-warning">
            No prep times yet
          </StatusBadge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <Banner tone="info" title="Stations are where kitchen work happens">
        Grill, fryer, tandoor, plating. Splitting work by station is what lets the till tell a captain whether a dish is
        waiting on people or on equipment.
      </Banner>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatTile label="Stations" value={rows.length} />
        <StatTile
          label="With a throughput"
          value={rows.filter((r) => r.capacityPerHour || r.equipmentItemsPerHour).length}
          sub="items/hour known"
        />
        <StatTile label="Timed items" value={rows.reduce((s, r) => s + (r.standardsCount || 0), 0)} />
      </div>

      <SectionCard
        title="Kitchen stations"
        actions={
          <div className="flex gap-2">
            {rows.length === 0 && (
              <Button size="sm" variant="outline" onClick={doSeed} disabled={saving}>
                <Wand2 />
                Use standard set
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setForm({ name: "", code: "", capacityPerHour: "" });
                setOpen(true);
              }}
            >
              <Plus />
              Add
            </Button>
          </div>
        }
      >
        <RecordList
          columns={columns}
          rows={rows}
          rowKey={(r) => r.stationId}
          loading={loading}
          loadingLabel="Loading stations…"
          emptyIcon={<span className="text-2xl">🔥</span>}
          emptyTitle="No stations yet"
          emptyDescription="Start from the standard set, then adjust to your kitchen."
          actions={(r) => (
            <Button
              size="icon-xs"
              variant="outline"
              aria-label="Edit station"
              onClick={() => {
                setEditing(r);
                setForm({
                  name: r.name,
                  code: r.code,
                  capacityPerHour: r.capacityPerHour ? String(r.capacityPerHour) : "",
                });
                setOpen(true);
              }}
            >
              <Pencil />
            </Button>
          )}
        />
      </SectionCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add a station"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Save station"}
            </Button>
          </>
        }
      >
        <FieldGrid>
          <Field label="Name" required className="sm:col-span-2">
            <TextInput
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Grill / Griddle"
            />
          </Field>
          {!editing && (
            <Field label="Code" hint="Auto-derived from the name if left blank.">
              <TextInput
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="GRILL"
              />
            </Field>
          )}
          <Field
            label="Items per hour"
            hint="How many items this station can physically turn out in an hour. Leave blank if you don't know — a guess would produce wrong wait times."
          >
            <NumberInput
              min="0"
              value={form.capacityPerHour}
              onChange={(e) => setForm((f) => ({ ...f, capacityPerHour: e.target.value }))}
            />
          </Field>
        </FieldGrid>
      </Modal>
    </div>
  );
}

/* ── Prep times ──────────────────────────────────────────────────────────── */

function PrepTimesTab() {
  const { user } = useAppSelector((s) => s.auth);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [weights, setWeights] = useState<Record<number, string>>({});
  const [overwrite, setOverwrite] = useState(false);

  const load = useCallback(async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    setLoading(true);
    try {
      const res = await getStations(user.restaurantId, user.branchId);
      const list = res.data ?? [];
      setStations(list);
      // Even split by default — the honest starting point when nothing is
      // known about how work divides between stations.
      const w: Record<number, string> = {};
      list.forEach((s: any) => (w[s.stationId] = "1"));
      setWeights(w);
    } catch {
      toast.error("Couldn't load stations — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId, user?.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const doSeed = async () => {
    if (!user?.branchId) return;
    const entries = stations
      .map((s) => ({ stationId: s.stationId, weight: Number(weights[s.stationId] || 0) }))
      .filter((w) => w.weight > 0);
    if (entries.length === 0) {
      toast.error("Give at least one station a share above zero.");
      return;
    }
    setSeeding(true);
    try {
      const res = await seedStandardsFromPrepTime({
        branchId: user.branchId,
        weights: entries,
        overwriteExisting: overwrite,
      });
      toast.success(`Prep times filled in from each dish's total time.`);
      void res;
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't fill in the prep times.");
    } finally {
      setSeeding(false);
    }
  };

  const totalWeight = stations.reduce((s, st) => s + (Number(weights[st.stationId]) || 0), 0);
  const timedTotal = stations.reduce((s, st) => s + (st.standardsCount || 0), 0);

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <Banner tone="info" title="Start from the times you already have">
        Every dish already carries a total prep time. This splits that total across your stations so estimates work from
        day one — then correct the dishes that matter. It's a starting point, not a measurement.
      </Banner>

      {stations.length === 0 ? (
        <Banner tone="warning" title="Add stations first">
          Prep times are recorded per station, so there's nothing to split until at least one station exists.
        </Banner>
      ) : (
        <SectionCard
          title="Split each dish's prep time"
          description="Set each station's share of a typical dish. Equal shares are a fine default."
        >
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {stations.map((s) => (
                <Field key={s.stationId} label={s.name} hint={totalWeight > 0 ? `${Math.round(((Number(weights[s.stationId]) || 0) / totalWeight) * 100)}% of a dish` : undefined}>
                  <NumberInput
                    min="0"
                    step="any"
                    value={weights[s.stationId] ?? ""}
                    onChange={(e) => setWeights((p) => ({ ...p, [s.stationId]: e.target.value }))}
                  />
                </Field>
              ))}
            </div>

            <ToggleRow
              label="Replace times I've already set"
              hint="Off means only dishes with no time yet are filled in."
              checked={overwrite}
              onChange={setOverwrite}
            />

            <Button size="block" onClick={doSeed} disabled={seeding || loading}>
              <Wand2 />
              {seeding ? "Filling in…" : "Fill in prep times"}
            </Button>

            <p className="text-xs text-muted-foreground">
              {timedTotal > 0
                ? `${timedTotal} dish-station times recorded so far.`
                : "No prep times recorded yet — estimates will fall back to each dish's plain total time."}
            </p>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ── Equipment ───────────────────────────────────────────────────────────── */

function EquipmentTab() {
  const { user } = useAppSelector((s) => s.auth);
  const [stations, setStations] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ itemsPerHour: "", stationId: "", notes: "", inService: true });

  const load = useCallback(async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    setLoading(true);
    try {
      const [eq, st] = await Promise.all([
        getEquipment(user.restaurantId, user.branchId),
        getStations(user.restaurantId, user.branchId),
      ]);
      setRows(eq.data ?? []);
      setStations(st.data ?? []);
    } catch {
      toast.error("Couldn't load equipment — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId, user?.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const openFor = (r: any) => {
    setTarget(r);
    setForm({
      itemsPerHour: r.itemsPerHour ? String(r.itemsPerHour) : "",
      stationId: r.stationId ? String(r.stationId) : "",
      notes: r.maintenanceNotes || "",
      inService: r.isActive !== false,
    });
  };

  const submit = async () => {
    if (!target) return;
    setSaving(true);
    try {
      const itemsPerHour = form.itemsPerHour === "" ? null : Number(form.itemsPerHour);
      // Two writes because they belong to two owners: the equipment record
      // holds service state and notes, while station wiring goes through the
      // labor endpoint that owns it.
      await updateEquipment(target.id, {
        isActive: form.inService,
        maintenanceNotes: form.notes || undefined,
        itemsPerHour,
      });
      const nextStationId = form.stationId === "" ? null : Number(form.stationId);
      if (nextStationId !== (target.stationId ?? null)) {
        await assignEquipmentToStation(target.id, { stationId: nextStationId, itemsPerHour });
      }
      toast.success(form.inService ? "Equipment updated" : `${target.name} marked out of service`);
      setTarget(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't update the equipment.");
    } finally {
      setSaving(false);
    }
  };

  const columns: RecordColumn<any>[] = [
    { key: "name", header: "Equipment", role: "primary", render: (r) => r.name },
    { key: "category", header: "Category", role: "secondary", render: (r) => r.category || "—" },
    {
      key: "rate",
      header: "Items / hour",
      role: "numeric",
      render: (r) => r.itemsPerHour ?? <span className="text-subtle-foreground">not set</span>,
    },
    {
      key: "state",
      header: "State",
      role: "meta",
      render: (r) =>
        r.isActive === false ? (
          <StatusBadge size="md" tone="bg-destructive/10 text-destructive">
            Out of service
          </StatusBadge>
        ) : (
          <StatusBadge size="md" tone="bg-success-muted text-success">
            In service
          </StatusBadge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <Banner tone="warning" title="Marking something down changes the wait times">
        A station's capacity is the sum of its working equipment. Taking a fryer out of service here immediately stops
        the till promising times that kitchen can't hit.
      </Banner>

      <SectionCard title="Equipment">
        <RecordList
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          loadingLabel="Loading equipment…"
          emptyIcon={<span className="text-2xl">🔧</span>}
          emptyTitle="No equipment recorded"
          emptyDescription="Equipment is added from the owner dashboard."
          rowTone={(r) => (r.isActive === false ? "danger" : "default")}
          actions={(r) => (
            <Button size="xs" variant="outline" onClick={() => openFor(r)}>
              Update
            </Button>
          )}
        />
      </SectionCard>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={target ? target.name : ""}
        description="Report a breakdown, or set what this unit can turn out."
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <ToggleRow
            label="In service"
            hint="Turn off when it's broken or being serviced."
            checked={form.inService}
            onChange={(v) => setForm((f) => ({ ...f, inService: v }))}
          />
          <FieldGrid>
            <Field
              label="Items per hour"
              hint="Sustained output, not how many fit at once. Time a few batches — a guess makes every wait time wrong."
            >
              <NumberInput
                min="0"
                value={form.itemsPerHour}
                onChange={(e) => setForm((f) => ({ ...f, itemsPerHour: e.target.value }))}
              />
            </Field>
            <Field label="Station" hint="Which station this unit belongs to.">
              <select
                value={form.stationId}
                onChange={(e) => setForm((f) => ({ ...f, stationId: e.target.value }))}
                className="h-11 w-full rounded-control border border-input bg-card px-3 text-foreground outline-none focus:border-primary"
              >
                <option value="">Not on a station</option>
                {stations.map((s) => (
                  <option key={s.stationId} value={s.stationId}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </FieldGrid>
          <Field label="What happened" hint="Kept on the record for whoever services it.">
            <TextArea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Thermostat failing, holds 40°C below set point"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

/* ── Checklists ──────────────────────────────────────────────────────────── */

function ChecklistsTab() {
  const { user } = useAppSelector((s) => s.auth);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState({ title: "", category: "OPENING", steps: "" });

  const load = useCallback(async () => {
    if (!user?.restaurantId) return;
    setLoading(true);
    try {
      const res = await getSopChecklists(user.restaurantId);
      setRows(res.data ?? []);
    } catch {
      toast.error("Couldn't load checklists — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user?.restaurantId) return;
    if (!form.title.trim()) {
      toast.error("Give the checklist a name.");
      return;
    }
    // One step per line → string[], which is what the API stores. Sending the
    // raw textarea value would hand a String to a String[] column.
    const steps = form.steps
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (steps.length === 0) {
      toast.error("Add at least one step, one per line.");
      return;
    }
    setSaving(true);
    try {
      const res = await createSopChecklist({
        restaurantId: user.restaurantId,
        branchId: user.branchId ?? undefined,
        title: form.title.trim(),
        category: form.category,
        steps,
      });
      if (res?.queuedOffline) {
        toast("No connection — checklist saved offline, it'll sync automatically.", { icon: "📴" });
      } else {
        toast.success("Checklist created");
      }
      setOpen(false);
      setForm({ title: "", category: "OPENING", steps: "" });
      await load();
    } catch {
      toast.error("Couldn't create the checklist — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSopChecklist(deleteTarget.id);
      setDeleteTarget(null);
      await load();
      toast.success("Checklist removed");
    } catch {
      toast.error("Couldn't remove it — please try again.");
    }
  };

  const columns: RecordColumn<any>[] = [
    { key: "title", header: "Checklist", role: "primary", render: (r) => r.title },
    { key: "category", header: "When", role: "secondary", render: (r) => r.category || "—" },
    {
      key: "steps",
      header: "Steps",
      role: "numeric",
      // steps comes back as an array; the older string handling is kept as a
      // fallback for any row written before that was settled.
      render: (r) =>
        Array.isArray(r.steps)
          ? r.steps.length
          : r.steps
            ? String(r.steps).split("\n").filter(Boolean).length
            : 0,
    },
  ];

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <Banner tone="info" title="Opening and closing routines">
        Write the routine once so it doesn't live in one person's head. One step per line.
      </Banner>

      <SectionCard
        title="Checklists"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus />
            New checklist
          </Button>
        }
      >
        <RecordList
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          loadingLabel="Loading checklists…"
          emptyIcon={<span className="text-2xl">📋</span>}
          emptyTitle="No checklists yet"
          emptyDescription="Add your opening and closing routines."
          actions={(r) => (
            <Button size="icon-xs" variant="destructive-outline" aria-label="Remove" onClick={() => setDeleteTarget(r)}>
              <Trash2 />
            </Button>
          )}
        />
      </SectionCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New checklist"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </>
        }
      >
        <FieldGrid>
          <Field label="Name" required className="sm:col-span-2">
            <TextInput
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Morning kitchen open"
            />
          </Field>
          <Field label="When" className="sm:col-span-2">
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="h-11 w-full rounded-control border border-input bg-card px-3 text-foreground outline-none focus:border-primary"
            >
              <option value="OPENING">Opening</option>
              <option value="CLOSING">Closing</option>
              <option value="SHIFT_CHANGE">Shift change</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </Field>
          <Field label="Steps" hint="One per line." className="sm:col-span-2">
            <TextArea
              value={form.steps}
              onChange={(e) => setForm((f) => ({ ...f, steps: e.target.value }))}
              placeholder={"Switch on the exhaust\nCheck fridge temperatures\nCount the till float"}
              className="min-h-32"
            />
          </Field>
        </FieldGrid>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove this checklist?"
        description={deleteTarget ? `${deleteTarget.title} — this cannot be undone.` : ""}
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
