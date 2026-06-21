import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface CartItem {
  menuItemId: number;
  itemName: string;
  quantity: number;
  price: number;
}

interface CartState {
  items: CartItem[];
  tableId: number | null;
  orderType: string;
}

const initialState: CartState = {
  items: [],
  tableId: null,
  orderType: "DINE_IN",
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existing = state.items.find((i) => i.menuItemId === action.payload.menuItemId);
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
    },
    removeItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((i) => i.menuItemId !== action.payload);
    },
    updateQuantity: (state, action: PayloadAction<{ menuItemId: number; quantity: number }>) => {
      const item = state.items.find((i) => i.menuItemId === action.payload.menuItemId);
      if (item) {
        item.quantity = action.payload.quantity;
        if (item.quantity <= 0) {
          state.items = state.items.filter((i) => i.menuItemId !== action.payload.menuItemId);
        }
      }
    },
    setTableId: (state, action: PayloadAction<number | null>) => {
      state.tableId = action.payload;
    },
    setOrderType: (state, action: PayloadAction<string>) => {
      state.orderType = action.payload;
    },
    clearCart: () => initialState,
  },
});

export const { addItem, removeItem, updateQuantity, setTableId, setOrderType, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
