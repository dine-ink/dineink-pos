import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface RunningOrder {
  id: number;
  tableId: number | null;
  orderType: string;
  kitchenStatus: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

interface OrderState {
  runningOrders: RunningOrder[];
  selectedOrderId: number | null;
  loading: boolean;
}

const initialState: OrderState = {
  runningOrders: [],
  selectedOrderId: null,
  loading: false,
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    setRunningOrders: (state, action: PayloadAction<RunningOrder[]>) => {
      state.runningOrders = action.payload;
    },
    setSelectedOrder: (state, action: PayloadAction<number | null>) => {
      state.selectedOrderId = action.payload;
    },
    setOrderLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearOrders: () => initialState,
  },
});

export const { setRunningOrders, setSelectedOrder, setOrderLoading, clearOrders } = orderSlice.actions;
export default orderSlice.reducer;
