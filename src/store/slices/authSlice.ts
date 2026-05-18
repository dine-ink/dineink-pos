import { createSlice } from "@reduxjs/toolkit";

type AuthState = {
  token: string;
  user: any;
  restaurant: any;
  branch: any;
  isAuthenticated: boolean;
};

const initialState: AuthState = {
  token: "",
  user: null,
  restaurant: null,
  branch: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (state, action) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.restaurant = action.payload.restaurant;
      state.branch = action.payload.branch;
      state.isAuthenticated = true;
    },

    logout: (state) => {
      state.token = "";
      state.user = null;
      state.restaurant = null;
      state.branch = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setAuth, logout } = authSlice.actions;

export default authSlice.reducer;
