import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import BillingTypeTabs from "../../../components/billing/BillingTypes";
import DineIn from "./DineIn_Billing";
import NormalBilling from "./Quick_Takeaway_Billing";
import { getBranchDetails } from "@/services/branchService";
import { getAllRunningOrders } from "@/services/runningOrderService";
import PageLoader from "@/components/ui/PageLoader";

export default function BillingPage() {
  const { branch, user } = useAppSelector((state) => state.auth);
  const [step, setStep] = useState<"MENU" | "CART" | "CUSTOMER">("MENU");
  const [billingType, setBillingType] = useState("");
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [topSellingItems, setTopSellingItems] = useState<any[]>([]);
  const [branchData, setBranchData] = useState<any>(null);
  const [runningOrders, setRunningOrders] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [data, ordersData] = await Promise.all([
        getBranchDetails(branch),
        user?.restaurantId && user?.branchId
          ? getAllRunningOrders(user.restaurantId, user.branchId)
          : Promise.resolve({ data: [] }),
      ]);
      setBranchData(data.data);
      setProducts(data.data.restaurant.menuItems || []);
      setTables(data.data.tables || []);
      setTopSellingItems(data.data.topSellingItems || []);
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
  }, [branch, user?.restaurantId, user?.branchId]);

  useEffect(() => {
    if (branch) fetchData();
  }, [branch, fetchData]);

  // Keep running-orders fresh so table colours update without full reload
  useEffect(() => {
    if (!user?.restaurantId || !user?.branchId) return;
    const poll = async () => {
      try {
        const ordersData = await getAllRunningOrders(user.restaurantId, user.branchId);
        setRunningOrders(ordersData.data || []);
      } catch { /* silent */ }
    };
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, [user?.restaurantId, user?.branchId]);

  useEffect(() => {
    const billingTypes = branchData?.billing?.billingTypes || [];
    if (billingTypes.includes("Table Wise Billing")) setBillingType("DINE_IN");
    else if (billingTypes.includes("Takeaway Billing")) setBillingType("TAKE_AWAY");
    else if (billingTypes.includes("Quick Billing")) setBillingType("QUICK_BILL");
  }, [branchData]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <div className="shrink-0 border-b border-gray-200 bg-white shadow-sm">
        <BillingTypeTabs
          billingType={billingType}
          setBillingType={setBillingType}
          setSelectedTable={setSelectedTable}
          branchData={branchData}
        />
      </div>
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
          />
        ) : (billingType === "TAKE_AWAY" || billingType === "QUICK_BILL") ? (
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
          />
        ) : null}
      </div>
    </div>
  );
}
