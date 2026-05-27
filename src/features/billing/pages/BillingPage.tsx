import { useEffect, useState } from "react";

import { ShoppingBag } from "lucide-react";

import { useAppSelector } from "@/store/hooks";

import BillingTypeTabs from "../../../components/billing/BillingTypes";

import DineIn from "./DineIn_Billing";

import NormalBilling from "./Quick_Takeaway_Billing";

import { getBranchDetails } from "@/services/branchService";

export default function BillingPage() {
  const { branch } = useAppSelector((state) => state.auth);
  const [selectedCategory, setSelectedCategory] = useState("");

  const [step, setStep] = useState<"MENU" | "CART" | "CUSTOMER">("MENU");

  const [billingType, setBillingType] = useState("");

  const [selectedTable, setSelectedTable] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState<any[]>([]);

  const [categories, setCategories] = useState<any[]>([]);

  const [tables, setTables] = useState<any[]>([]);

  const [topSellingItems, setTopSellingItems] = useState<any[]>([]);

  const [branchData, setBranchData] = useState<any>(null);

  // ================= FETCH DATA =================

  const fetchData = async () => {
    try {
      setLoading(true);

      const data = await getBranchDetails(branch);

      setBranchData(data.data);

      const menuItems = data.data.restaurant.menuItems || [];

      setProducts(menuItems);

      setTables(data.data.tables || []);

      setTopSellingItems(data.data.topSellingItems || []);

      // ================= CATEGORIES =================

      const originalCategories = data.data.restaurant.categories || [];

      const updatedCategories = [
        {
          id: "BEST_SELLERS",

          name: "Best Sellers",

          iconName: "Trending",
        },

        ...originalCategories,
      ];

      setCategories(updatedCategories);

      if (categories.length > 0) {
        setSelectedCategory("Best Sellers");
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // ================= INITIAL LOAD =================

  useEffect(() => {
    if (branch) {
      fetchData();
    }
  }, [branch]);
  useEffect(() => {
    const billingTypes = branchData?.billing?.billingTypes || [];

    // PRIORITY ORDER

    if (billingTypes.includes("Table Wise Billing")) {
      setBillingType("DINE_IN");

      return;
    }

    if (billingTypes.includes("Takeaway Billing")) {
      setBillingType("TAKE_AWAY");

      return;
    }

    if (billingTypes.includes("Quick Billing")) {
      setBillingType("QUICK_BILL");
    }
  }, [branchData]);
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8fafc]">
      {/* ================= HEADER ================= */}

      <div className="border-b border-gray-200 bg-white py-3 shadow-sm">
        <div className="flex items-center justify-between">
          {/* BILL TYPES */}

          <BillingTypeTabs
            billingType={billingType}
            setBillingType={setBillingType}
            setSelectedTable={setSelectedTable}
            branchData={branchData}
          />

          <button
            onClick={() => setStep("CART")}
            className="relative mr-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ================= CONTENT ================= */}

      <div className="flex-1 overflow-hidden">
        {/* DINE IN */}

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

        {/* TAKE AWAY / QUICK BILL */}

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
