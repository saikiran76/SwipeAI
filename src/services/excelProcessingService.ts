import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_MAPPING } from './HeaderMapping';
import { Invoice, Product, Customer, ExtractedData } from '../utils/types';

const mapHeaders = (headers: string[]): Record<string, string> => {
  const mappedHeaders: Record<string, string> = {};
  headers.forEach((header) => {
    const normalizedHeader = header.toLowerCase().trim();
    mappedHeaders[normalizedHeader] = HEADER_MAPPING[normalizedHeader] || header;
  });
  return mappedHeaders;
};

export const processExcelFile = async (file: File): Promise<ExtractedData> => {
  try {
    const fileContent = await file.arrayBuffer();
    const workbook = XLSX.read(fileContent, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
      throw new Error('Excel file is empty or missing data.');
    }

    const headers = rows[0] as string[];
    const mappedHeaders = mapHeaders(headers);

    const requiredFields = Object.values(HEADER_MAPPING);

    const dataRows = rows.slice(1).map((row: any) => {
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        const mappedHeader = mappedHeaders[header.toLowerCase().trim()];
        rowData[mappedHeader] = row[index] || ''; // Default missing fields to an empty string
      });

      // Ensure all required fields are present
      requiredFields.forEach((field) => {
        if (!rowData[field]) {
          rowData[field] = ''; // Fill missing fields with an empty string
        }
      });

      return rowData;
    });

    // Transform rows into structured data
    const invoices: Invoice[] = [];
    const products: Product[] = [];
    const customersMap = new Map<string, Customer>();

    dataRows.forEach((row) => {
      const customerName = row['Customer Name'] || 'Unknown Customer';
      const productName = row['Product Name'] || 'Unknown Product';

      const customer = customersMap.get(customerName) || {
        id: `CUST_${uuidv4()}`,
        name: customerName,
        phoneNumber: row['Customer Phone'] || '0000000000',
        email: row['Customer Email'] || 'unknown@example.com',
        address: row['Customer Address'] || 'Unknown Address',
        totalPurchaseAmount: 0,
      };

      const productId = `PROD_${uuidv4()}`;
      const invoiceId = `INV_${uuidv4()}`;

      invoices.push({
        id: invoiceId,
        serialNumber: row['Invoice Number'] || `INV_${Math.floor(Math.random() * 10000)}`,
        customerId: customer.id,
        customerName: customer.name,
        productId,
        productName,
        quantity: parseFloat(row['Quantity']) || 0,
        taxRate: parseFloat(row['Tax Rate']) || 0,
        totalAmount: parseFloat(row['Total Amount']) || 0,
        date: row['Invoice Date'] || 'Unknown Date',
      });

      products.push({
        id: productId,
        name: productName,
        quantity: parseFloat(row['Quantity']) || 0,
        unitPrice: parseFloat(row['Unit Price'] || '0').toFixed(2),
        discountDisplay: '',
        taxDisplay: '',
        discountRate: '',
        discountAmount: '',
        taxRate: parseFloat(row['Tax Rate'] || '0').toFixed(2),
        taxAmount: parseFloat(row['Tax Amount'] || '0').toFixed(2),
        priceWithTax: (
          parseFloat(row['Unit Price'] || '0') *
          (1 + parseFloat(row['Tax Rate'] || '0') / 100)
        ).toFixed(2),
      });

      customer.totalPurchaseAmount += parseFloat(row['Total Amount']) || 0;
      customersMap.set(customerName, customer);
    });

    const customers = Array.from(customersMap.values());
    return { invoices, products, customers };
  } catch (error: any) {
    console.error('Error processing Excel file:', error);
    throw new Error(`Failed to process Excel file: ${error.message}`);
  }
};
