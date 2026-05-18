import type { TypedUseSelectorHook } from "react-redux";

import { useDispatch, useSelector } from "react-redux";

import type { RootState, AppDispatch } from "./index";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
