import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import BillingTypeTabs from "../../../components/billing/BillingTypes";
import DineIn from "./DineIn_Billing";
import NormalBilling from "./Quick_Takeaway_Billing";
import { getBranchDetails } from "@/services/branchService";
import { getAllRunningOrders } from "@/services/runningOrderService";
import { getRestaurantAddOnAttachments } from "@/services/addonService";
import PageLoader from "@/components/ui/PageLoader";
import PrinterSetupModal from "@/components/PrinterSetupModal";
import { getSavedPrinter } from "@/utils/printer";
import { usePolling } from "@/hooks/usePolling";
import { Printer } from "lucide-react";

export default function BillingPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [step, setStep] = useState<"MENU" | "CART" | "CUSTOMER">("MENU");
  const [billingType, setBillingType] = useState("");
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [hasPrinter, setHasPrinter] = useState(() => !!getSavedPrinter());
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [topSellingItems, setTopSellingItems] = useState<any[]>([]);
  const [branchData, setBranchData] = useState<any>(null);
  const [runningOrders, setRunningOrders] = useState<any[]>([]);
  const [addOnMap, setAddOnMap] = useState<Record<number, any[]>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [data, ordersData, addOnData] = await Promise.all([
        getBranchDetails(user?.branchId),
        user?.restaurantId && user?.branchId
          ? getAllRunningOrders(user.restaurantId, user.branchId)
          : Promise.resolve({ data: [] }),
        user?.restaurantId
          ? getRestaurantAddOnAttachments(user.restaurantId)
          : Promise.resolve({ data: {} }),
      ]);
      setBranchData(data.data);
      setAddOnMap(addOnData.data || {});
      const menuItems: any[] = data.data.restaurant.menuItems || [];
      setProducts(menuItems);
      setTables(data.data.tables || []);
      // topSellingItems from API only has {name, soldQuantity} — join with menuItems to get full item data
      const rawTopSelling: { name: string }[] = data.data.topSellingItems || [];
      const topSelling = rawTopSelling
        .map((ts) => menuItems.find((mi) => mi.name === ts.name))
        .filter(Boolean);
      setTopSellingItems(topSelling);
      setRunningOrders(ordersData.data || []);
      const originalCategories = data.data.restaurant.categories || [];
      setCategories([
        { id: "BEST_SELLERS", name: "Best Sellers", iconName: "Trending" },
        ...originalCategories,
      ]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user?.branchId, user?.restaurantId]);

  useEffect(() => {
    if (user?.branchId) fetchData();
  }, [user?.branchId, fetchData]);

  // Keep running-orders fresh so table colours update without full reload
  usePolling(
    async () => {
      if (!user?.restaurantId || !user?.branchId) return;
      try {
        const ordersData = await getAllRunningOrders(user.restaurantId, user.branchId);
        setRunningOrders(ordersData.data || []);
      } catch { /* silent */ }
    },
    30000,
    [user?.restaurantId, user?.branchId],
  );

  useEffect(() => {
    const billingTypes = branchData?.billing?.billingTypes || [];
    if (billingTypes.includes("Table Wise Billing")) setBillingType("DINE_IN");
    else if (billingTypes.includes("Takeaway Billing") || billingTypes.includes("Quick Billing")) {
      setBillingType("TAKEAWAY_QUICK");
    }
  }, [branchData]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 items-center border-b border-border bg-card pr-2">
        <div className="min-w-0 flex-1">
          <BillingTypeTabs
            billingType={billingType}
            setBillingType={setBillingType}
            setSelectedTable={setSelectedTable}
            branchData={branchData}
          />
        </div>
        <button
          onClick={() => setPrinterModalOpen(true)}
          title="Printer setup"
          aria-label={hasPrinter ? "Printer connected — open printer setup" : "No printer — open printer setup"}
          className={`ml-1 flex h-10 shrink-0 items-center gap-1.5 rounded-control border px-3 text-xs font-bold transition-colors ${
            hasPrinter
              ? "border-success/30 bg-success-muted text-success"
              : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Printer className="h-4 w-4" />
          <span className="hidden sm:inline">{hasPrinter ? "Printer" : "No Printer"}</span>
        </button>
      </div>

      <PrinterSetupModal
        isOpen={printerModalOpen}
        onClose={() => {
          setHasPrinter(!!getSavedPrinter());
          setPrinterModalOpen(false);
        }}
      />
      <div className="flex-1 min-h-0 overflow-hidden p-1.5 sm:p-2 xl:p-2.5">
        {loading && !branchData ? (
          <PageLoader />
        ) : billingType === "DINE_IN" ? (
          <DineIn
            step={step}
            setStep={setStep}
            selectedTable={selectedTable}
            setSelectedTable={setSelectedTable}
            products={products}
            categories={categories}
            tables={tables}
            topSellingItems={topSellingItems}
            fetchData={fetchData}
            loading={loading}
            branchData={branchData}
            billingType={billingType}
            runningOrders={runningOrders}
            addOnMap={addOnMap}
          />
        ) : billingType === "TAKEAWAY_QUICK" ? (
          <NormalBilling
            billingType={billingType}
            step={step}
            setStep={setStep}
            products={products}
            categories={categories}
            topSellingItems={topSellingItems}
            fetchData={fetchData}
            loading={loading}
            branchData={branchData}
            addOnMap={addOnMap}
          />
        ) : null}
      </div>
    </div>
  );
}
