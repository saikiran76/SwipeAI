import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../appStore';

export const selectInvoices = (state: RootState) => state.invoices.items;
export const selectCustomers = (state: RootState) => state.customers.items;
export const selectProducts = (state: RootState) => state.products.items;

export const getEnrichedInvoices = createSelector(
    [
      (state: RootState) => state.invoices.items,
      (state: RootState) => state.customers.items,
      (state: RootState) => state.products.items
    ],
    (invoices, customers, products) => {
      return invoices.map(invoice => {
        const customer = customers.find(c => c.id === invoice.customerId);
        const product = products.find(p => p.id === invoice.productId);
        if (!customer || !product) {
          console.warn(`Missing relationship - Invoice: ${invoice.id}, Customer: ${invoice.customerId}, Product: ${invoice.productId}`);
        }
        
        return {
          ...invoice,
          customerName: customer?.name || `Customer ${invoice.customerId}`,
          productName: product?.name || `Product ${invoice.productId}`,
          unitPrice: product?.unitPrice || 0,
          priceWithTax: product?.priceWithTax || 0
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