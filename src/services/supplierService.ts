import { api } from "./api";

/**
 * Supplier deliveries: log the bill that arrived with the goods, settle it,
 * and reorder. Previously all three were owner-web only, so a manager
 * photographed a delivery note and waited.
 *
 * Note on vendor scope: Vendor.branchId is nullable and null means "supplies
 * every branch". The backend's fetchVendors handles that with an
 * OR[{branchId},{branchId:null}] filter — before that fix an exact-match
 * filter silently hid every all-branch vendor, which is most of them.
 */

export const getVendors = async (restaurantId: number, branchId: number) => {
  const res = await api.get(`/ingredients/${restaurantId}/${branchId}/fetchVendors`);
  return res.data;
};

export const getVendorOutstanding = async (restaurantId: number, branchId: number) => {
  const res = await api.get(`/vendors/outstanding/${restaurantId}/${branchId}`);
  return res.data;
};

export const getVendorInvoices = async (vendorId: number) => {
  const res = await api.get(`/vendors/${vendorId}/invoices`);
  return res.data;
};

/**
 * Creates the invoice. Sent as multipart when a photo of the bill is attached
 * so the e-bill lands on the record — the backend's uploadDocument middleware
 * is a no-op for plain JSON, so the same endpoint serves both shapes.
 *
 * Deliberately NOT offline-queued: the queue replays a JSON body via
 * api.post, which would silently drop the attached file. A delivery bill
 * without its photo is worse than a retry.
 */
export const createVendorInvoice = async (
  payload: {
    restaurantId: number;
    branchId: number;
    vendorId: number;
    invoiceNumber?: string;
    invoiceDate: string;
    dueDate?: string;
    totalAmount: number;
    notes?: string;
    createdById?: number;
  },
  document?: File | null,
) => {
  if (document) {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, String(v));
    });
    form.append("document", document);
    const res = await api.post("/vendors/invoices", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  }
  const res = await api.post("/vendors/invoices", payload);
  return res.data;
};

export const payVendorInvoice = async (
  invoiceId: number,
  payload: { amount: number; paymentMethod?: string; paidById?: number; notes?: string },
) => {
  const res = await api.put(`/vendors/invoices/${invoiceId}/pay`, payload);
  return res.data;
};

export const createVendorPayment = async (payload: {
  restaurantId: number;
  branchId: number;
  vendorId: number;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
  createdById?: number;
}) => {
  const res = await api.post("/vendors/payments", payload);
  return res.data;
};

/**
 * Sends a reorder to the vendor over WhatsApp or email. OWNER/MANAGER gated.
 *
 * The payload is `ingredientIds` + `channel` — NOT quantities. The backend
 * composes the message from the ingredients' own reorder levels, so the caller
 * picks WHAT to reorder, not how much. An earlier version of this function sent
 * `items: [{ ingredientId, quantity }]`, which the service ignores entirely:
 * every request would have been accepted and produced an empty order.
 */
export const reorderFromVendor = async (
  vendorId: number,
  payload: { branchId?: number; channel: "whatsapp" | "email"; ingredientIds: number[] },
) => {
  const res = await api.post(`/vendors/${vendorId}/reorder`, payload);
  return res.data;
};

/** Ingredients this vendor supplies — the pick-list for a reorder. */
export const getVendorIngredients = async (vendorId: number) => {
  const res = await api.get(`/ingredients/vendors/${vendorId}/ingredients`);
  return res.data;
};
