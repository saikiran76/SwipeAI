import { parseTaxInfo } from './taxParser';
import { v4 as uuidv4 } from 'uuid';

export type RawExtractedData = {
    'Invoice number': string;
    'Date': string;
    'Total amount': number;
    'Product names': string;
    'Unit Amount': number;
    'Quantity': number;
    'Price with tax': number;
    'Tax amount': string;
    'Party name': string;
    'Company name': string;
}[];

export const buildDataRelationships = (rawData: any[]) => {
  return rawData.map(item => {
    const invoiceId = `INV_${uuidv4()}`;
    const customerId = `CUST_${uuidv4()}`;
    const productIds = (item['Product names'] || []).map(() => `PROD_${uuidv4()}`);

    const invoices = [{
      id: invoiceId,
      serialNumber: item['Invoice number'] || 'unknown',
      customerId: customerId,
      productId: productIds[0], // Link to first product for backward compatibility
      quantity: Array.isArray(item.Quantity) ? item.Quantity.reduce((a: number, b: number) => a + b, 0) : 1,
      tax: parseFloat(String(item['Tax amount']).replace(/[^0-9.]/g, '')),
      totalAmount: parseFloat(String(item['Total amount']).replace(/[^0-9.]/g, '')),
      date: item.Date || 'unknown'
    }];

    const products = (item['Product names'] || []).map((name: string, index: number) => ({
      id: productIds[index],
      name: name,
      quantity: Array.isArray(item.Quantity) ? parseFloat(item.Quantity[index]) : 1,
      unitPrice: Array.isArray(item['Unit Amount']) ? parseFloat(String(item['Unit Amount'][index]).replace(/[^0-9.]/g, '')) : 0,
      tax: parseFloat(String(item['Tax amount']).replace(/[^0-9.]/g, '')) / (Array.isArray(item['Product names']) ? item['Product names'].length : 1),
      priceWithTax: Array.isArray(item['Price with tax']) ? parseFloat(String(item['Price with tax'][index]).replace(/[^0-9.]/g, '')) : 0
    }));

    const customers = [{
      id: customerId,
      name: item['Party name'] || 'unknown',
      phoneNumber: '0000000000', // Default phone number as it's not in Gemini response
      totalPurchaseAmount: parseFloat(String(item['Total amount']).replace(/[^0-9.]/g, ''))
    }];

    return {
      invoices,
      products,
      customers
    };
  })[0]; // Take first item since we're processing single invoices
};
   