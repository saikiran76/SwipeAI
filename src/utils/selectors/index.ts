import { createSelector } from 'reselect';
import { RootState } from '../appStore';

export const selectInvoices = (state: RootState) => state.invoices.items;
export const selectCustomers = (state: RootState) => state.customers.items;
export const selectProducts = (state: RootState) => state.products.items;

export const getEnrichedInvoices = createSelector(
  [selectInvoices, selectCustomers, selectProducts],
  (invoices, customers, products) => {
    return invoices.map((invoice) => {
      const customer = customers.find((c) => c.id === invoice.customerId);
      const product = products.find((p) => p.id === invoice.productId);

      return {
        ...invoice,
        customerName: customer?.name || 'Unknown Customer',
        productName: product?.name || 'Unknown Product',
        taxRate: invoice?.taxRate || '',
        taxAmount: product?.taxAmount || '',
      };
    });
  }
);
    
export const getCustomerWithInvoices = createSelector(
  [selectInvoices, selectCustomers, 
   (_state: RootState, customerId: string) => customerId],
  (invoices, customers, customerId) => {
    const customer = customers.find(c => c.id === customerId);
    const customerInvoices = invoices.filter(i => i.customerId === customerId);
    
    return {
      ...customer,
      invoices: customerInvoices
    };
  }
); 