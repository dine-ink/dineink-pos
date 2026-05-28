import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import BillingTypeTabs from "../../../components/billing/BillingTypes";
import DineIn from "./DineIn_Billing";
import NormalBilling from "./Quick_Takeaway_Billing";
import { getBranchDetails } from "@/services/branchService";

export default function BillingPage() {
  const { branch } = useAppSelector((state) => state.auth);
  const [step, setStep] = useState<"MENU" | "CART" | "CUSTOMER">("MENU");
  const [billingType, setBillingType] = useState("");
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [topSellingItems, setTopSellingItems] = useState<any[]>([]);
  const [branchData, setBranchData] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getBranchDetails(branch);
      setBranchData(data.data);
      setProducts(data.data.restaurant.menuItems || []);
      setTables(data.data.tables || []);
      setTopSellingItems(data.data.topSellingItems || []);

      const originalCategories = data.data.restaurant.categories || [];
      setCategories([
        { id: "BEST_SELLERS", name: "Best Sellers", iconName: "Trending" },
        ...originalCategories,
      ]);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branch) fetchData();
  }, [branch]);

  useEffect(() => {
    const billingTypes = branchData?.billing?.billingTypes || [];
    if (billingTypes.includes("Table Wise Billing")) {
      setBillingType("DINE_IN");
    } else if (billingTypes.includes("Takeaway Billing")) {
      setBillingType("TAKE_AWAY");
    } else if (billingTypes.includes("Quick Billing")) {
      setBillingType("QUICK_BILL");
    }
  }, [branchData]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* ===== BILLING TYPE HEADER ===== */}
      <div className="shrink-0 border-b border-gray-200 bg-white shadow-sm">
        <BillingTypeTabs
          billingType={billingType}
          setBillingType={setBillingType}
          setSelectedTable={setSelectedTable}
          branchData={branchData}
        />
      </div>

      {/* ===== CONTENT ===== */}
      <div className="flex-1 min-h-0 overflow-hidden p-2 sm:p-3 xl:p-4">
        {billingType === "DINE_IN" && (
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
          />
        )}
        {(billingType === "TAKE_AWAY" || billingType === "QUICK_BILL") && (
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
        )}
      </div>
    </div>
  );
}
