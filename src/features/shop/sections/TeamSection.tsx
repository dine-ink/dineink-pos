import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CalendarDays, Clock, Plane, UserPlus, Plus, Trash2 } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import {
  correctAttendance,
  createStaff,
  deleteLeave,
  getLeaveRequests,
  getStaff,
  recordLeave,
} from "@/services/teamService";
import { getTodayAttendance, type AttendanceRow } from "@/services/attendanceService";
import Attendance from "@/components/manage_shop/Attendance";
import { SegmentedTabs, SectionCard, Banner, StatTile } from "@/components/ui/page";
import { RecordList, type RecordColumn } from "@/components/ui/record-list";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, FieldGrid, TextInput, NumberInput, SelectInput, TextArea } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatShortDate } from "@/utils/format";

/**
 * Team admin, all manager-mediated. Most staff have no login of their own
 * (User.hasLogin defaults false), so none of these flows has a self-service
 * half: an employee tells the manager, the manager records it here.
 *
 * Attendance itself reuses the existing screen unchanged — clocking in and out
 * already worked. What's new is everything that previously required the owner:
 * fixing a missed clock-out, recording leave, and adding a joiner.
 */

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Tab = "attendance" | "corrections" | "leave" | "staff";

export default function TeamSection() {
  const [tab, setTab] = useState<Tab>("attendance");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SegmentedTabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "attendance", label: "Attendance", icon: <CalendarDays className="h-3.5 w-3.5" /> },
          { id: "corrections", label: "Fix hours", icon: <Clock className="h-3.5 w-3.5" /> },
          { id: "leave", label: "Leave", icon: <Plane className="h-3.5 w-3.5" /> },
          { id: "staff", label: "Staff", icon: <UserPlus className="h-3.5 w-3.5" /> },
        ]}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tab === "attendance" && <Attendance />}
        {tab === "corrections" && <CorrectionsTab />}
        {tab === "leave" && <LeaveTab />}
        {tab === "staff" && <StaffTab />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Fix hours — someone forgot to clock out
   ══════════════════════════════════════════════════════════════════════════ */

function CorrectionsTab() {
  const { user } = useAppSelector((s) => s.auth);
  const [staff, setStaff] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<AttendanceRow | null>(null);
  const [date, setDate] = useState(todayIso());
  const [hours, setHours] = useState("");
  const [overtime, setOvertime] = useState("");
  const [status, setStatus] = useState("PRESENT");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      const res = await getTodayAttendance(user.branchId);
      setStaff(res.data || []);
    } catch {
      toast.error("Couldn't load the team — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [user?.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const openFor = (row: AttendanceRow) => {
    setTarget(row);
    setDate(todayIso());
    setHours(row.totalHours ? String(row.totalHours) : "");
    setOvertime("");
    setStatus("PRESENT");
  };

  const submit = async () => {
    if (!target || !user?.restaurantId || !user?.branchId) return;
    const parsedHours = hours === "" ? null : Number(hours);
    if (parsedHours !== null && (!Number.isFinite(parsedHours) || parsedHours < 0 || parsedHours > 24)) {
      toast.error("Total hours must be between 0 and 24.");
      return;
    }
    setSaving(true);
    try {
      const res = await correctAttendance({
        userId: target.id,
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        date,
        manualTotalHours: parsedHours,
        overtimeHours: overtime === "" ? null : Number(overtime),
        status,
      });
      if (res?.queuedOffline) {
        toast("No connection — correction saved offline, it'll sync automatically.", { icon: "📴", duration: 5000 });
      } else {
        toast.success(`Hours updated for ${target.name}`);
      }
      setTarget(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't save the correction — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const columns: RecordColumn<AttendanceRow>[] = [
    { key: "name", header: "Name", role: "primary", render: (r) => r.name },
    {
      key: "clock",
      header: "Clocked",
      role: "secondary",
      render: (r) => (r.status ? "Currently clocked in" : "Not clocked in"),
    },
    { key: "hours", header: "Hours today", role: "numeric", render: (r) => (r.totalHours ? `${r.totalHours} h` : "—") },
  ];

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <Banner tone="warning" title="Manager-only, and it changes what payroll pays">
        A correction overwrites the clocked hours used for pay. It's recorded against your login.
      </Banner>

      <SectionCard title="Today's team" description="Pick someone to correct their hours for any date.">
        <RecordList
          columns={columns}
          rows={staff}
          rowKey={(r) => r.id}
          loading={loading}
          loadingLabel="Loading the team…"
          emptyIcon={<span className="text-2xl">🧑‍🍳</span>}
          emptyTitle="No staff at this branch"
          actions={(r) => (
            <Button size="xs" variant="outline" onClick={() => openFor(r)}>
              Fix hours
            </Button>
          )}
        />
      </SectionCard>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={target ? `Correct hours — ${target.name}` : ""}
        description="Leave a field blank to leave it unchanged."
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Save correction"}
            </Button>
          </>
        }
      >
        <FieldGrid>
          <Field label="Date" required>
            <TextInput type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Status">
            <SelectInput value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="PRESENT">Present</option>
              <option value="HALF_DAY">Half day</option>
              <option value="ABSENT">Absent</option>
            </SelectInput>
          </Field>
          <Field label="Total hours" hint="What they actually worked, 0–24.">
            <NumberInput step="any" min="0" max="24" value={hours} onChange={(e) => setHours(e.target.value)} />
          </Field>
          <Field label="Overtime hours" hint="On top of the total above.">
            <NumberInput step="any" min="0" value={overtime} onChange={(e) => setOvertime(e.target.value)} />
          </Field>
        </FieldGrid>
      </Modal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Leave
   ══════════════════════════════════════════════════════════════════════════ */

const LEAVE_TYPES = ["CASUAL", "SICK", "EARNED", "UNPAID"];

function LeaveTab() {
  const { user } = useAppSelector((s) => s.auth);
  const [rows, setRows] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({
    userId: "",
    leaveType: "CASUAL",
    startDate: todayIso(),
    endDate: todayIso(),
    reason: "",
  });

  const load = useCallback(async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    setLoading(true);
    try {
      const [leaveRes, staffRes] = await Promise.all([
        getLeaveRequests(user.restaurantId, user.branchId),
        getTodayAttendance(user.branchId),
      ]);
      setRows(leaveRes.data || []);
      setStaff(staffRes.data || []);
    } catch {
      toast.error("Couldn't load leave records — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId, user?.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user?.branchId) return;
    if (!form.userId) {
      toast.error("Pick who the leave is for.");
      return;
    }
    if (form.endDate < form.startDate) {
      toast.error("The end date can't be before the start date.");
      return;
    }
    setSaving(true);
    try {
      // status APPROVED in one call: the manager entering this IS the
      // approver, so a create-then-approve pair would only add a window where
      // a failure leaves the leave stuck PENDING with nobody watching a queue.
      const res = await recordLeave({
        userId: Number(form.userId),
        branchId: user.branchId,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
        status: "APPROVED",
      });
      if (res?.queuedOffline) {
        toast("No connection — leave saved offline, it'll sync automatically.", { icon: "📴", duration: 5000 });
      } else {
        toast.success("Leave recorded");
      }
      setOpen(false);
      setForm({ userId: "", leaveType: "CASUAL", startDate: todayIso(), endDate: todayIso(), reason: "" });
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't record the leave — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLeave(deleteTarget.id);
      setDeleteTarget(null);
      await load();
      toast.success("Leave record removed");
    } catch {
      toast.error("Couldn't remove that record — please try again.");
    }
  };

  const counts = useMemo(
    () => ({
      approved: rows.filter((r) => r.status === "APPROVED").length,
      pending: rows.filter((r) => r.status === "PENDING").length,
    }),
    [rows],
  );

  const columns: RecordColumn<any>[] = [
    { key: "name", header: "Employee", role: "primary", render: (r) => r.user?.name ?? `#${r.userId}` },
    {
      key: "dates",
      header: "Dates",
      role: "secondary",
      render: (r) => `${formatShortDate(r.startDate)} → ${formatShortDate(r.endDate)}`,
    },
    { key: "type", header: "Type", render: (r) => r.leaveType },
    { key: "reason", header: "Reason", tableOnly: true, render: (r) => r.reason || "—" },
    {
      key: "status",
      header: "Status",
      role: "meta",
      render: (r) => (
        <StatusBadge
          size="md"
          tone={
            r.status === "APPROVED"
              ? "bg-success-muted text-success"
              : r.status === "REJECTED"
                ? "bg-destructive/10 text-destructive"
                : "bg-warning-muted text-warning"
          }
        >
          {r.status}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatTile label="Records" value={rows.length} />
        <StatTile label="Approved" value={counts.approved} tone="success" />
        <StatTile label="Pending" value={counts.pending} tone={counts.pending ? "warning" : "default"} />
      </div>

      <SectionCard
        title="Leave records"
        description="Recorded by you on the employee's behalf — approved as it's entered."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus />
            Record leave
          </Button>
        }
      >
        <RecordList
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          loadingLabel="Loading leave records…"
          emptyIcon={<span className="text-2xl">🌴</span>}
          emptyTitle="No leave recorded yet"
          emptyDescription="Record leave here when someone tells you they'll be away."
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
        title="Record leave"
        description="For an employee who told you in person."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Record leave"}
            </Button>
          </>
        }
      >
        <FieldGrid>
          <Field label="Employee" required className="sm:col-span-2">
            <SelectInput value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
              <option value="">Select an employee…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Leave type">
            <SelectInput value={form.leaveType} onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))}>
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="From" required>
            <TextInput
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </Field>
          <Field label="To" required>
            <TextInput
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </Field>
          <Field label="Reason" className="sm:col-span-2">
            <TextArea
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Optional"
            />
          </Field>
        </FieldGrid>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove this leave record?"
        description={deleteTarget ? `${deleteTarget.user?.name ?? "Employee"} — this cannot be undone.` : ""}
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Staff — add a joiner
   ══════════════════════════════════════════════════════════════════════════ */

const ROLES = ["STAFF", "CASHIER", "MANAGER"];
const DEPARTMENTS = ["", "KITCHEN", "SERVICE", "BILLING", "HOUSEKEEPING"];

function StaffTab() {
  const { user } = useAppSelector((s) => s.auth);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    role: "STAFF",
    department: "",
    shift: "",
    joiningDate: todayIso(),
  });

  const load = useCallback(async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    setLoading(true);
    try {
      const res = await getStaff(user.restaurantId, user.branchId);
      // The endpoint has been seen returning either shape depending on
      // caller; accept both rather than rendering an empty list.
      setRows(res.data ?? res.staff ?? []);
    } catch {
      toast.error("Couldn't load staff — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId, user?.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user?.branchId) return;
    if (!form.name.trim()) {
      toast.error("A name is required.");
      return;
    }
    setSaving(true);
    try {
      await createStaff({
        name: form.name.trim(),
        phone: form.phone || undefined,
        role: form.role,
        department: form.department || undefined,
        shift: form.shift || undefined,
        joiningDate: form.joiningDate,
        branchId: user.branchId,
        // No login by default — most staff never sign in, and creating
        // credentials from a shared tablet isn't something to do by accident.
        hasLogin: false,
      });
      toast.success(`${form.name.trim()} added — they can be marked present straight away.`);
      setOpen(false);
      setForm({ name: "", phone: "", role: "STAFF", department: "", shift: "", joiningDate: todayIso() });
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't add them — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const columns: RecordColumn<any>[] = [
    { key: "name", header: "Name", role: "primary", render: (r) => r.name },
    { key: "role", header: "Role", role: "secondary", render: (r) => [r.role, r.department].filter(Boolean).join(" · ") },
    { key: "phone", header: "Phone", render: (r) => r.phone || "—" },
    { key: "shift", header: "Shift", tableOnly: true, render: (r) => r.shift || "—" },
    {
      key: "joined",
      header: "Joined",
      render: (r) => (r.joiningDate ? formatShortDate(r.joiningDate) : "—"),
    },
  ];

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <Banner tone="info" title="Pay stays with the owner">
        You can add a joiner so they can be rostered and marked present today. Salary isn't set here — it's entered from
        the owner dashboard.
      </Banner>

      <SectionCard
        title="Staff at this branch"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <UserPlus />
            Add joiner
          </Button>
        }
      >
        <RecordList
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          loadingLabel="Loading staff…"
          emptyIcon={<span className="text-2xl">🧑‍🍳</span>}
          emptyTitle="No staff yet"
        />
      </SectionCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a joiner"
        description="Enough to roster them today. The owner fills in pay later."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Adding…" : "Add to team"}
            </Button>
          </>
        }
      >
        <FieldGrid>
          <Field label="Full name" required className="sm:col-span-2">
            <TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Phone">
            <TextInput
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </Field>
          <Field label="Joining date">
            <TextInput
              type="date"
              value={form.joiningDate}
              onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))}
            />
          </Field>
          <Field label="Role">
            <SelectInput value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Department" hint="Kitchen puts their device on the KDS.">
            <SelectInput
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d || "none"} value={d}>
                  {d ? d.charAt(0) + d.slice(1).toLowerCase() : "None"}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Shift" className="sm:col-span-2">
            <TextInput
              value={form.shift}
              onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value }))}
              placeholder="e.g. Morning, Evening, Split"
            />
          </Field>
        </FieldGrid>
      </Modal>
    </div>
  );
}
