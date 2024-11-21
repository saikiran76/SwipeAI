import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../appStore';

export const selectInvoices = (state: RootState) => state.invoices.items;
export const selectCustomers = (state: RootState) => state.customers.items;
export const selectProducts = (state: RootState) => state.products.items;

export const getEnrichedInvoices = createSelector(
    [selectInvoices, selectCustomers, selectProducts],
    (invoices, customers, products) => {
      console.log('Selector received:', { invoices, customers, products });
  
      const enriched = invoices.map((invoice) => {
        const customer = customers.find((c) => c.id === invoice.customerId) || {
          name: `Unknown Customer (${invoice.customerId})`,
        };
        const product = products.find((p) => p.id === invoice.productId) || {
          name: `Unknown Product (${invoice.productId})`,
          unitPrice: 0,
          priceWithTax: 0,
        };
  
        return {
          ...invoice,
          customerName: customer.name,
          productName: product.name,
          unitPrice: product.unitPrice,
          priceWithTax: product.priceWithTax,
        };
      });
  
      return enriched;
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