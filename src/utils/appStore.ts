import { configureStore } from '@reduxjs/toolkit';
import invoicesReducer from './reducers/invoicesSlice';
import productsReducer from './reducers/productsSlice';
import customersReducer from './reducers/customersSlice';

export const store = configureStore({
  reducer: {
    invoices: invoicesReducer,
    products: productsReducer,
    customers: customersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;