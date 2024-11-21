import { Invoice, Product, Customer } from '../utils/types';
import { v4 as uuidv4 } from 'uuid';

interface ExtractedData {
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
}

export const validateExtractedData = (data: any): ExtractedData => {
  // Basic structure validation
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data structure');
  }

  // Ensure arrays exist
  data.invoices = Array.isArray(data.invoices) ? data.invoices : [];
  data.products = Array.isArray(data.products) ? data.products : [];
  data.customers = Array.isArray(data.customers) ? data.customers : [];

  // Create default entries if arrays are empty
  if (data.invoices.length === 0) {
    const defaultId = `INV_${uuidv4()}`;
    data.invoices.push({
      id: defaultId,
      serialNumber: 'unknown',
      customerId: 'unknown',
      productId: 'unknown',
      quantity: 0,
      tax: 0,
      totalAmount: 0,
      date: new Date().toISOString().split('T')[0]
    });
  }

  if (data.customers.length === 0) {
    data.customers.push({
      id: `CUST_${uuidv4()}`,
      name: 'Unknown Customer',
      phoneNumber: '0000000000',
      totalPurchaseAmount: 0
    });
  }

  if (data.products.length === 0) {
    data.products.push({
      id: `PROD_${uuidv4()}`,
      name: 'Unknown Product',
      quantity: 0,
      unitPrice: 0,
      tax: 0,
      priceWithTax: 0
    });
  }

  return data as ExtractedData;
};

export const validateDataTypes = (data: any): boolean => {
  const typeValidators = {
    invoices: {
      id: (v: any) => typeof v === 'string' && v.startsWith('INV_'),
      serialNumber: (v: any) => typeof v === 'string' && v.length > 0,
      quantity: (v: any) => typeof v === 'number' && v > 0,
      tax: (v: any) => typeof v === 'number' && v >= 0,
      totalAmount: (v: any) => typeof v === 'number' && v > 0,
      date: (v: any) => /^\d{4}-\d{2}-\d{2}$/.test(v)
    },
    products: {
      id: (v: any) => typeof v === 'string' && v.startsWith('PROD_'),
      name: (v: any) => typeof v === 'string' && v.length > 0,
      quantity: (v: any) => typeof v === 'number' && v >= 0,
      unitPrice: (v: any) => typeof v === 'number' && v > 0,
      tax: (v: any) => typeof v === 'number' && v >= 0,
      priceWithTax: (v: any) => typeof v === 'number' && v > 0
    },
    customers: {
      id: (v: any) => typeof v === 'string' && v.startsWith('CUST_'),
      name: (v: any) => typeof v === 'string' && v.length > 0,
      phoneNumber: (v: any) => typeof v === 'string' && v.length > 0,
      totalPurchaseAmount: (v: any) => typeof v === 'number' && v >= 0
    }
  };

  return Object.entries(typeValidators).every(([section, validators]) => 
    data[section]?.every((item: any) => 
      Object.entries(validators).every(([field, validator]) => validator(item[field]))
    )
  );
}; 

import * as XLSX from "xlsx";

interface ExcelRow {
  [key: string]: string | number | null;
}

interface NormalizedExcelData {
  serialNumber: string;
  customerName: string;
  productName: string;
  quantity: number;
  tax: number;
  totalAmount: number;
  date: Date | null;
}

export const parseExcel = async (file: File): Promise<NormalizedExcelData[]> => {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (jsonData.length < 2) {
      throw new Error("Invalid file: No data found.");
    }

    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1) as unknown[][];

    const mappedData = rows.map((row: unknown[]): ExcelRow => {
      const rowData: ExcelRow = {};
      headers.forEach((header: string, index: number) => {
        rowData[header] = row[index] as string | number || null;
      });
      return rowData;
    });

    return validateAndNormalizeExcelData(mappedData);
  } catch (error) {
    console.error("Excel Parsing Error: ", error);
    throw new Error("Failed to parse Excel file. Ensure format is correct.");
  }
};

export const validateAndNormalizeExcelData = (data: ExcelRow[]): NormalizedExcelData[] => {
  return data.map((row: ExcelRow): NormalizedExcelData => ({
    serialNumber: String(row["Serial Number"] || "Missing"),
    customerName: String(row["Customer Name"] || "Unknown"),
    productName: String(row["Product Name"] || "N/A"),
    quantity: Number(row["Quantity"]) || 0,
    tax: Number(row["Tax"]) || 0,
    totalAmount: Number(row["Total Amount"]) || 0,
    date: row["Date"] ? new Date(row["Date"]) : null
  }));
};
