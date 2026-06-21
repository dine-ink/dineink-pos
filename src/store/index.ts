import { configureStore, combineReducers } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
import billingReducer from "./slices/billingSlice";
import cartReducer from "./slices/cartSlice";
import orderReducer from "./slices/orderSlice";

import { persistStore, persistReducer } from "redux-persist";

import storage from "redux-persist/es/storage";

const rootReducer = combineReducers({
  auth: authReducer,
  billing: billingReducer,
  cart: cartReducer,
  order: orderReducer,
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
