import { ExtractedData, Customer, Product, Invoice } from '../utils/types';
import { v4 as uuidv4 } from 'uuid';

export const transformExtractedData = (rawData: any): ExtractedData => {
    const sanitize = (value: any, fallback: any) => (value !== null && value !== undefined ? value : fallback);
  
    // Create customers array with unique IDs and default values
    const customers: Customer[] = rawData.customers.map((customer: any, index: number) => ({
      id: `CUST_${uuidv4()}`,
      name: sanitize(customer.name, 'Unknown Customer'),
      phoneNumber: sanitize(customer.phone, '0000000000'),
      email: sanitize(customer.email, 'unknown@example.com'),
      address: sanitize(customer.address, 'Unknown Address'),
      totalPurchaseAmount: 0, // Initialize with zero or calculate later
    }));
  
    // Create products array (if any data is provided)
    const products: Product[] = rawData.products.map((product: any) => ({
      id: `PROD_${uuidv4()}`,
      name: sanitize(product.name, 'Unknown Product'),
      quantity: sanitize(parseFloat(product.quantity), 0),
      unitPrice: sanitize(parseFloat(product.unitPrice), '0.00'),
      discountRate: sanitize(product.discountRate, '0'),
      taxRate: sanitize(parseFloat(product.taxRate), '0.00'),
      taxAmount: sanitize(parseFloat(product.taxAmount), '0.00'),
      priceWithTax: sanitize(parseFloat(product.priceWithTax), '0.00'),
    }));
  
    // Create invoices array and ensure customer IDs reference existing customers
    const invoices: Invoice[] = rawData.invoices.map((invoice: any) => {
      const customerIndex = invoice.customer_id; // Assuming this is the correct mapping
      return {
        id: `INV_${uuidv4()}`,
        serialNumber: sanitize(invoice.invoice_id, `INV_${Math.floor(Math.random() * 10000)}`),
        customerId: customerIndex < customers.length ? customers[customerIndex].id : '',
        customerName: customerIndex < customers.length ? customers[customerIndex].name : 'Unknown Customer',
        productId: '', // Assuming products are handled separately
        productName: 'N/A', // Placeholder if no products are associated
        quantity: sanitize(parseFloat(invoice.quantity), 0),
        taxRate: sanitize(parseFloat(invoice.taxRate), 0),
        totalAmount: sanitize(parseFloat(invoice.total_amount), 0),
        date: sanitize(invoice.date, 'Unknown Date'),
      };
    });
  
    return { customers, products, invoices };
  };
