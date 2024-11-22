import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Invoice } from '../types/index';

interface InvoiceState {
  items: Invoice[];
  loading: boolean;
  error: string | null;
}

const initialState: InvoiceState = {
  items: [],
  loading: false,
  error: null,
};

const invoiceSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    setInvoices: (state, action: PayloadAction<Invoice[]>) => {
      state.items = action.payload;
    },
    addInvoice: (state, action: PayloadAction<Invoice>) => {
      state.items.push(action.payload);
    },
    updateInvoice: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Invoice> }>
    ) => {
      const { id, updates } = action.payload;
      const index = state.items.findIndex((invoice) => invoice.id === id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...updates };
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setInvoices, addInvoice, updateInvoice, setLoading, setError } =
  invoiceSlice.actions;

export default invoiceSlice.reducer;