import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Truck, Receipt, Plus, IndianRupee, Paperclip, Send } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import {
  createVendorInvoice,
  getVendorIngredients,
  getVendorInvoices,
  getVendorOutstanding,
  getVendors,
  payVendorInvoice,
  reorderFromVendor,
} from "@/services/supplierService";
import { getReorderAlerts } from "@/services/stockService";
import { SegmentedTabs, SectionCard, Banner, StatTile } from "@/components/ui/page";
import { RecordList, type RecordColumn } from "@/components/ui/record-list";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, FieldGrid, TextInput, NumberInput, SelectInput, TextArea, ToggleRow } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/utils/format";

/**
 * Supplier deliveries. A delivery arrives mid-service with a paper bill; until
 * now that bill was photographed and the owner keyed it in later. This logs it
 * on the spot, attaches the photo, and settles it.
 *
 * Deliberately NOT offline-queued: the queue replays a JSON body, which would
 * silently drop the attached bill photo. A delivery record without its bill is
 * worse than being told to retry when the connection returns.
 */

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Tab = "receive" | "reorder" | "outstanding";

export default function SuppliersSection() {
  const [tab, setTab] = useState<Tab>("receive");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SegmentedTabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "receive", label: "Receive delivery", icon: <Truck className="h-3.5 w-3.5" /> },
          { id: "reorder", label: "Reorder", icon: <Send className="h-3.5 w-3.5" /> },
          { id: "outstanding", label: "Outstanding", icon: <Receipt className="h-3.5 w-3.5" /> },
        ]}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tab === "receive" && <ReceiveTab onLogged={() => setRefreshKey((k) => k + 1)} />}
        {tab === "reorder" && <ReorderTab />}
        {tab === "outstanding" && <OutstandingTab refreshKey={refreshKey} />}
      </div>
    </div>
  );
}

/* ── Reorder ─────────────────────────────────────────────────────────────── */

/**
 * Sends a reorder over WhatsApp or email. Starts from what's actually low
 * rather than a blank form: the store already knows it's out of tomatoes, and
 * the point is to remove the "tell the owner, wait for the owner" step.
 *
 * No quantities — the endpoint composes the order from each ingredient's own
 * reorder level, so this picks WHAT, not how much.
 */
function ReorderTab() {
  const { user } = useAppSelector((s) => s.auth);
  const [vendors, setVendors] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [vendorItems, setVendorItems] = useState<any[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    setLoading(true);
    try {
      const [v, alerts] = await Promise.all([
        getVendors(user.restaurantId, user.branchId),
        getReorderAlerts(user.restaurantId).catch(() => ({ data: [] })),
      ]);
      setVendors(v.data ?? v.vendors ?? []);
      setLowStock(alerts.data ?? []);
    } catch {
      toast.error("Couldn't load suppliers — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId, user?.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  // Which of this vendor's ingredients to offer. Pre-ticks anything already
  // flagged low, so the common case is "check the list, hit send".
  useEffect(() => {
    if (!vendorId) {
      setVendorItems([]);
      setPicked(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getVendorIngredients(Number(vendorId));
        if (cancelled) return;
        const items = res.data ?? [];
        setVendorItems(items);
        const lowIds = new Set(lowStock.map((l: any) => l.id ?? l.ingredientId));
        setPicked(new Set(items.filter((i: any) => lowIds.has(i.id)).map((i: any) => i.id)));
      } catch {
        if (!cancelled) setVendorItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId, lowStock]);

  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const send = async () => {
    if (!vendorId) {
      toast.error("Pick a supplier.");
      return;
    }
    if (picked.size === 0) {
      toast.error("Tick at least one item to reorder.");
      return;
    }
    setSending(true);
    try {
      await reorderFromVendor(Number(vendorId), {
        branchId: user?.branchId,
        channel,
        ingredientIds: [...picked],
      });
      toast.success(`Reorder sent by ${channel === "whatsapp" ? "WhatsApp" : "email"}`);
      setPicked(new Set());
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't send the reorder — please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      {lowStock.length > 0 ? (
        <Banner tone="warning" title={`${lowStock.length} item${lowStock.length > 1 ? "s" : ""} at or below reorder level`}>
          {lowStock.slice(0, 8).map((l: any) => l.name).join(", ")}
          {lowStock.length > 8 ? ` +${lowStock.length - 8} more` : ""}
        </Banner>
      ) : (
        <Banner tone="success" title="Nothing below its reorder level">
          You can still send a reorder for anything you know is running out.
        </Banner>
      )}

      <SectionCard title="Send a reorder" description="Quantities come from each item's reorder level.">
        <div className="flex flex-col gap-3">
          <FieldGrid>
            <Field label="Supplier" required>
              <SelectInput value={vendorId} onChange={(e) => setVendorId(e.target.value)} disabled={loading}>
                <option value="">{loading ? "Loading…" : "Select a supplier…"}</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Send by">
              <SelectInput value={channel} onChange={(e) => setChannel(e.target.value as "whatsapp" | "email")}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </SelectInput>
            </Field>
          </FieldGrid>

          {vendorId && (
            <div className="flex flex-col gap-2">
              <p className="text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase">
                Items ({picked.size} selected)
              </p>
              {vendorItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No ingredients are linked to this supplier yet — link them from the owner dashboard first.
                </p>
              ) : (
                <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
                  {vendorItems.map((i: any) => (
                    <ToggleRow
                      key={i.id}
                      label={i.name}
                      hint={i.quantity != null ? `${i.quantity} ${i.unit || ""} on hand` : undefined}
                      checked={picked.has(i.id)}
                      onChange={() => toggle(i.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <Button size="block" onClick={send} disabled={sending || !vendorId || picked.size === 0}>
            <Send />
            {sending ? "Sending…" : `Send reorder${picked.size ? ` (${picked.size})` : ""}`}
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

/* ── Receive a delivery ──────────────────────────────────────────────────── */

function ReceiveTab({ onLogged }: { onLogged: () => void }) {
  const { user } = useAppSelector((s) => s.auth);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    vendorId: "",
    invoiceNumber: "",
    invoiceDate: todayIso(),
    dueDate: "",
    totalAmount: "",
    notes: "",
  });

  const load = useCallback(async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    setLoading(true);
    try {
      const res = await getVendors(user.restaurantId, user.branchId);
      setVendors(res.data ?? res.vendors ?? []);
    } catch {
      toast.error("Couldn't load suppliers — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId, user?.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    const amount = Number(form.totalAmount);
    if (!form.vendorId) {
      toast.error("Pick which supplier this delivery came from.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter the bill total.");
      return;
    }
    setSaving(true);
    try {
      await createVendorInvoice(
        {
          restaurantId: user.restaurantId,
          branchId: user.branchId,
          vendorId: Number(form.vendorId),
          invoiceNumber: form.invoiceNumber || undefined,
          invoiceDate: form.invoiceDate,
          dueDate: form.dueDate || undefined,
          totalAmount: amount,
          notes: form.notes || undefined,
          createdById: user.id,
        },
        file,
      );
      toast.success("Delivery logged");
      setForm({
        vendorId: "",
        invoiceNumber: "",
        invoiceDate: todayIso(),
        dueDate: "",
        totalAmount: "",
        notes: "",
      });
      setFile(null);
      onLogged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't log the delivery — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <Banner tone="info" icon={<Truck className="h-4 w-4" />} title="Log it while the driver's still here">
        Enter what's on the paper bill and photograph it. Needs a connection — the photo can't be queued offline.
      </Banner>

      <SectionCard title="New delivery" description="Everything except the photo is on the supplier's bill.">
        <div className="flex flex-col gap-3">
          <FieldGrid>
            <Field label="Supplier" required className="sm:col-span-2">
              <SelectInput
                value={form.vendorId}
                onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value }))}
                disabled={loading}
              >
                <option value="">{loading ? "Loading suppliers…" : "Select a supplier…"}</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Bill total" required hint="The amount on the bill, before any payment.">
              <NumberInput
                step="any"
                min="0"
                value={form.totalAmount}
                onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
                placeholder="0.00"
              />
            </Field>
            <Field label="Bill number">
              <TextInput
                value={form.invoiceNumber}
                onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                placeholder="As printed"
              />
            </Field>
            <Field label="Bill date" required>
              <TextInput
                type="date"
                value={form.invoiceDate}
                onChange={(e) => setForm((f) => ({ ...f, invoiceDate: e.target.value }))}
              />
            </Field>
            <Field label="Payment due" hint="Leave blank if paid on delivery.">
              <TextInput
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <TextArea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Short delivery, damaged crate, substitution…"
              />
            </Field>
          </FieldGrid>

          <div className="flex flex-col gap-2 rounded-control border border-dashed border-input p-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
              <span className="flex h-10 items-center gap-2 rounded-control bg-secondary px-3 text-sm font-semibold text-secondary-foreground">
                <Paperclip className="h-4 w-4" />
                {file ? "Change photo" : "Attach bill photo"}
              </span>
              <span className="min-w-0 truncate text-xs text-muted-foreground">
                {file ? file.name : "Camera or gallery — optional but recommended"}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                // capture hints the OS toward the camera on a phone, which is
                // how a delivery bill is actually captured on the floor.
                capture="environment"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <Button size="block" onClick={submit} disabled={saving}>
            <Plus />
            {saving ? "Logging…" : "Log delivery"}
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

/* ── Outstanding ─────────────────────────────────────────────────────────── */

function OutstandingTab({ refreshKey }: { refreshKey: number }) {
  const { user } = useAppSelector((s) => s.auth);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [payTarget, setPayTarget] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.restaurantId || !user?.branchId) return;
    setLoading(true);
    try {
      const res = await getVendorOutstanding(user.restaurantId, user.branchId);
      setRows(res.data ?? []);
    } catch {
      toast.error("Couldn't load outstanding bills — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId, user?.branchId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Only vendors with something actually owed — getVendorOutstandingService
  // returns EVERY vendor, including ones with a zero balance, so listing it
  // raw made "what you owe" mostly noise.
  const owing = rows.filter((r) => Number(r.outstanding) > 0);
  const totalOutstanding = owing.reduce((s, r) => s + (Number(r.outstanding) || 0), 0);

  const submitPayment = async () => {
    if (!payTarget) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter how much you're paying.");
      return;
    }
    setSaving(true);
    try {
      // The outstanding endpoint returns per-vendor totals and no invoice id,
      // so the invoice to settle has to be fetched here. Oldest unpaid first,
      // which is the order a supplier expects to be paid in.
      const res = await getVendorInvoices(payTarget.id);
      const open = (res.data ?? [])
        .filter((i: any) => i.status !== "PAID" && Number(i.totalAmount) > Number(i.paidAmount))
        .sort(
          (a: any, b: any) =>
            new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime(),
        );
      if (open.length === 0) {
        toast.error("No open bill found for this supplier — log the delivery first.");
        return;
      }
      await payVendorInvoice(open[0].id, { amount: amt });
      toast.success(`Payment recorded against bill ${open[0].invoiceNumber || `#${open[0].id}`}`);
      setPayTarget(null);
      setAmount("");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't record the payment — please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Field names below are exactly what getVendorOutstandingService returns:
  // the vendor row spread, plus totalBilled / totalPaid / totalRecordedPayments
  // / outstanding / pendingInvoices. Earlier this read unpaidInvoiceCount and
  // overdueInvoiceCount, neither of which exists — so open bills always showed
  // zero and every supplier was badged "On time".
  const columns: RecordColumn<any>[] = [
    { key: "name", header: "Supplier", role: "primary", render: (r) => r.name ?? "—" },
    {
      key: "invoices",
      header: "Open bills",
      role: "secondary",
      render: (r) => `${r.pendingInvoices ?? 0} open`,
    },
    {
      key: "billed",
      header: "Billed",
      role: "numeric",
      tableOnly: true,
      render: (r) => formatCurrency(r.totalBilled),
    },
    {
      key: "outstanding",
      header: "Outstanding",
      role: "numeric",
      render: (r) => formatCurrency(r.outstanding),
    },
    {
      key: "state",
      header: "State",
      role: "meta",
      render: (r) =>
        Number(r.totalPaid) > 0 && Number(r.outstanding) > 0 ? (
          <StatusBadge size="md" tone="bg-warning-muted text-warning">
            Part paid
          </StatusBadge>
        ) : (
          <StatusBadge size="md" tone="bg-info-muted text-info">
            Unpaid
          </StatusBadge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatTile label="Suppliers owed" value={owing.length} sub={`of ${rows.length} suppliers`} />
        <StatTile
          label="Total outstanding"
          value={formatCurrency(totalOutstanding)}
          tone={totalOutstanding > 0 ? "warning" : "success"}
        />
        <StatTile
          label="Open bills"
          value={owing.reduce((s, r) => s + (Number(r.pendingInvoices) || 0), 0)}
        />
      </div>

      <SectionCard title="What you owe" description="Settle a bill without waiting for the owner.">
        <RecordList
          columns={columns}
          rows={owing}
          rowKey={(r) => r.id}
          loading={loading}
          loadingLabel="Loading outstanding bills…"
          emptyIcon={<span className="text-2xl">✅</span>}
          emptyTitle="Nothing outstanding"
          emptyDescription="Every logged supplier bill is settled."
          actions={(r) => (
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setPayTarget(r);
                setAmount(String(r.outstanding ?? ""));
              }}
            >
              <IndianRupee />
              Pay
            </Button>
          )}
        />
      </SectionCard>

      <Modal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title={payTarget ? `Pay ${payTarget.name ?? "supplier"}` : ""}
        description="Recorded against the oldest open bill."
        footer={
          <>
            <Button variant="outline" onClick={() => setPayTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitPayment} disabled={saving}>
              {saving ? "Recording…" : "Record payment"}
            </Button>
          </>
        }
      >
        {/* Amount only. There is deliberately no payment-method selector:
            payVendorInvoiceService accepts nothing but the amount, so a method
            dropdown here would look recorded and be silently discarded.
            Capturing method properly means a VendorPayment ledger entry, which
            is a separate action rather than a field on this one. */}
        <Field
          label="Amount"
          required
          hint={
            payTarget
              ? `${formatCurrency(payTarget.outstanding)} outstanding across ${payTarget.pendingInvoices ?? 0} open bill(s). Part payments are fine.`
              : undefined
          }
        >
          <NumberInput step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}
