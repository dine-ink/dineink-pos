import { api } from "./api";
import { enqueueBillAction, isNetworkError } from "@/utils/offlineQueue";
import type { BillData } from "@/utils/printer";

// Creates a Bill directly from an item list — doesn't depend on a
// pre-existing RunningOrder row, so it can run standalone once connectivity
// returns. On a genuine network failure this queues locally instead of
// throwing: it returns a provisional bill number to print immediately, and
// the real server-assigned invoice number prints automatically once this
// syncs (see offlineQueue's flushQueue).
export const createBill = async (
  data: any,
  billMeta: Omit<BillData, "billNo">,
): Promise<{ success: boolean; bill?: any; queuedOffline?: boolean; provisionalBillNo?: string }> => {
  try {
    const response = await api.post("/bills/create", data);
    return response.data;
  } catch (err: any) {
    if (isNetworkError(err)) {
      const action = enqueueBillAction(
        "/bills/create",
        data,
        billMeta,
        `Bill for ${billMeta.customerName || "walk-in"} (${billMeta.items.length} item(s))`,
      );
      return {
        success: true,
        queuedOffline: true,
        provisionalBillNo: action.billMeta!.provisionalBillNo,
      };
    }
    throw err;
  }
};

export const getBills = async () => {
  const response = await api.get("/bills");

  return response.data;
};
