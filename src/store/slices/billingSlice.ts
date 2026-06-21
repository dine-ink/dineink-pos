import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface BillingState {
  activeBillId: number | null;
  paymentMethod: string;
  discountAmount: number;
}

const initialState: BillingState = {
  activeBillId: null,
  paymentMethod: "CASH",
  discountAmount: 0,
};

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {
    setActiveBill: (state, action: PayloadAction<number | null>) => {
      state.activeBillId = action.payload;
    },
    setPaymentMethod: (state, action: PayloadAction<string>) => {
      state.paymentMethod = action.payload;
    },
    setDiscountAmount: (state, action: PayloadAction<number>) => {
      state.discountAmount = action.payload;
    },
    resetBilling: () => initialState,
  },
});

export const { setActiveBill, setPaymentMethod, setDiscountAmount, resetBilling } = billingSlice.actions;
export default billingSlice.reducer;
