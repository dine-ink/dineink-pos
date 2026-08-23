import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Search, ShieldCheck, Lock, Pencil } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { getBranchDetails } from "@/services/branchService";
import { updateMenuItem } from "@/services/menuAdminService";
import { verifyManagerOverride } from "@/services/authService";
import { isNetworkError } from "@/utils/offlineQueue";
import { SectionCard, Banner, StatTile } from "@/components/ui/page";
import { RecordList, type RecordColumn } from "@/components/ui/record-list";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, FieldGrid, TextInput, NumberInput, ToggleRow } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/utils/format";

/**
 * Day-scoped menu edits from the floor: correct a wrong price, or flip
 * something sold out. Previously anything beyond the kitchen's availability
 * toggle needed owner-web.
 *
 * ── Why the manager password, not just the role ───────────────────────────
 * PUT /restaurant/menu-items/:id is only auth-gated on the server, so the role
 * alone isn't much of a barrier — and the failure mode here is silent. A
 * mistyped price doesn't error; it just quietly sells at the wrong number until
 * someone notices in a report. So this reuses verifyManagerOverride, the same
 * prompt already guarding discount approval at checkout, and holds the approval
 * for one editing session rather than per item.
 *
 * The override is deliberately NOT cached across visits: leaving the tab and
 * coming back asks again, because a shared tablet left unlocked on this screen
 * shouldn't stay authorised.
 */

type MenuRow = {
  id: number;
  name: string;
  price: number;
  isAvailable: boolean;
  prepTime?: number | null;
  categoryId: number | null;
};

export default function ShopMenuSection() {
  const { user } = useAppSelector((s) => s.auth);
  const [rows, setRows] = useState<MenuRow[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Manager approval, held for this mount only.
  const [approved, setApproved] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState("");

  const [editing, setEditing] = useState<MenuRow | null>(null);
  const [form, setForm] = useState({ price: "", available: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      const res = await getBranchDetails(user.branchId);
      const items = res?.data?.restaurant?.menuItems ?? [];
      setRows(
        items.map((m: any) => ({
          id: m.id,
          name: m.name,
          price: Number(m.price) || 0,
          isAvailable: m.isAvailable !== false,
          prepTime: m.prepTime,
          categoryId: m.categoryId ?? null,
        })),
      );
      setCategories(res?.data?.restaurant?.categories ?? []);
    } catch {
      toast.error("Couldn't load the menu — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [user?.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const verify = async () => {
    if (!password) return;
    setVerifying(true);
    setAuthError("");
    try {
      const res = await verifyManagerOverride(password);
      if (res.success) {
        setApproved(true);
        setPassword("");
      } else {
        setAuthError(res.message || "Incorrect manager password");
      }
    } catch (err: any) {
      setAuthError(
        isNetworkError(err)
          ? "No connection — manager approval needs internet access."
          : err?.response?.data?.message || "Incorrect manager password",
      );
    } finally {
      setVerifying(false);
    }
  };

  const categoryName = (id: number | null) => categories.find((c) => c.id === id)?.name ?? "Uncategorised";

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const soldOut = rows.filter((r) => !r.isAvailable).length;

  const openEdit = (row: MenuRow) => {
    setEditing(row);
    setForm({ price: String(row.price), available: row.isAvailable });
  };

  const save = async () => {
    if (!editing) return;
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid price.");
      return;
    }
    // Guard rail against a fat-fingered decimal — a 10x price change is far
    // more likely to be a typo than a real decision, and it sells wrong
    // silently until someone reads a report.
    if (editing.price > 0 && (price > editing.price * 5 || price < editing.price / 5)) {
      const ok = window.confirm(
        `That changes ${editing.name} from ${formatCurrency(editing.price)} to ${formatCurrency(price)}. Is that right?`,
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      await updateMenuItem(editing.id, { price, isAvailable: form.available });
      toast.success(`${editing.name} updated`);
      setEditing(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't update the item — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const columns: RecordColumn<MenuRow>[] = [
    { key: "name", header: "Item", role: "primary", render: (r) => r.name },
    { key: "cat", header: "Category", role: "secondary", render: (r) => categoryName(r.categoryId) },
    { key: "price", header: "Price", role: "numeric", render: (r) => formatCurrency(r.price) },
    {
      key: "prep",
      header: "Prep",
      role: "numeric",
      tableOnly: true,
      render: (r) => (r.prepTime ? `${r.prepTime} min` : "—"),
    },
    {
      key: "state",
      header: "State",
      role: "meta",
      render: (r) =>
        r.isAvailable ? (
          <StatusBadge size="md" tone="bg-success-muted text-success">
            Available
          </StatusBadge>
        ) : (
          <StatusBadge size="md" tone="bg-destructive/10 text-destructive">
            Sold out
          </StatusBadge>
        ),
    },
  ];

  // ── Locked state ────────────────────────────────────────────────────────
  if (!approved) {
    return (
      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <Banner tone="warning" icon={<Lock className="h-4 w-4" />} title="Manager approval needed">
          Prices affect every bill from now on, and a wrong one sells silently. Enter the manager password to make
          changes on this screen.
        </Banner>

        <SectionCard title="Unlock menu editing">
          <div className="flex flex-col gap-3">
            <Field label="Manager password" error={authError || undefined}>
              <TextInput
                type="password"
                value={password}
                autoComplete="off"
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") verify();
                }}
                placeholder="••••••••"
              />
            </Field>
            <Button size="block" onClick={verify} disabled={verifying || !password}>
              <ShieldCheck />
              {verifying ? "Checking…" : "Unlock"}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Today's menu" description="Read-only until unlocked.">
          <RecordList
            columns={columns}
            rows={rows.slice(0, 50)}
            rowKey={(r) => r.id}
            loading={loading}
            loadingLabel="Loading the menu…"
            emptyIcon={<span className="text-2xl">🍽</span>}
            emptyTitle="No menu items"
            rowTone={(r) => (r.isAvailable ? "default" : "danger")}
          />
        </SectionCard>
      </div>
    );
  }

  // ── Unlocked ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <Banner tone="success" icon={<ShieldCheck className="h-4 w-4" />} title="Editing unlocked for this visit">
        Leaving this tab locks it again. Changes apply immediately to new bills.
      </Banner>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatTile label="Items" value={rows.length} />
        <StatTile label="Sold out" value={soldOut} tone={soldOut ? "danger" : "success"} />
        <StatTile label="Showing" value={visible.length} sub="after search" />
      </div>

      <SectionCard
        title="Menu"
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find an item…"
              className="pl-9"
            />
          </div>
        }
      >
        <RecordList
          columns={columns}
          rows={visible}
          rowKey={(r) => r.id}
          loading={loading}
          loadingLabel="Loading the menu…"
          emptyIcon={<span className="text-2xl">🍽</span>}
          emptyTitle={search ? "Nothing matches that search" : "No menu items"}
          rowTone={(r) => (r.isAvailable ? "default" : "danger")}
          actions={(r) => (
            <Button size="icon-xs" variant="outline" aria-label={`Edit ${r.name}`} onClick={() => openEdit(r)}>
              <Pencil />
            </Button>
          )}
        />
      </SectionCard>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? editing.name : ""}
        description={editing ? `Currently ${formatCurrency(editing.price)}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <FieldGrid columns={1}>
            <Field label="Price (₹)" required hint="Applies to bills from now on. Past bills are untouched.">
              <NumberInput
                step="any"
                min="0"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </Field>
          </FieldGrid>
          <ToggleRow
            label="Available"
            hint="Turn off to mark it sold out for the rest of service."
            checked={form.available}
            onChange={(v) => setForm((f) => ({ ...f, available: v }))}
          />
        </div>
      </Modal>
    </div>
  );
}
