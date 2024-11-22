import { Invoice, Product, Customer } from '../utils/types';
// import { v4 as uuidv4 } from 'uuid';

interface ExtractedData {
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
}

export const validateExtractedData = (data: any): ExtractedData => {
  // Basic structure validation
  if (!data || typeof data !== "object") {
    throw new Error("Invalid data structure");
  }

  // Ensure arrays exist
  data.invoices = Array.isArray(data.invoices) ? data.invoices : [];
  data.products = Array.isArray(data.products) ? data.products : [];
  data.customers = Array.isArray(data.customers) ? data.customers : [];

  // No need to create default entries if arrays are empty
  return data as ExtractedData;
};

export const validateExtractedDataNew = (data: any): ExtractedData => {
  // Check if the data is an object
  if (!data || typeof data !== "object") {
    throw new Error("Invalid data structure: Expected an object.");
  }

  // Ensure required fields exist and are arrays
  const invoices = Array.isArray(data.invoices) ? data.invoices : [];
  const products = Array.isArray(data.products) ? data.products : [];
  const customers = Array.isArray(data.customers) ? data.customers : [];

  // Perform deeper validation (optional)
  if (products.some((product: Product) => typeof product.unitPrice !== "number")) {
    throw new Error("Invalid product data: `unitPrice` must be a number.");
  }

  if (invoices.some((invoice: Invoice) => typeof invoice.totalAmount !== "number")) {
    throw new Error("Invalid invoice data: `totalAmount` must be a number.");
  }

  if (customers.some((customer: Customer) => typeof customer.name !== "string")) {
    throw new Error("Invalid customer data: `name` must be a string.");
  }

  // Return validated data
  return {
    invoices,
    products,
    customers,
  } as ExtractedData;
};

export const validateDataTypes = (data: any): boolean => {
  console.log('Validation - Input data structure:', {
    hasInvoices: Array.isArray(data.invoices),
    hasProducts: Array.isArray(data.products),
    hasCustomers: Array.isArray(data.customers)
  });

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
      quantity: (v: any) => typeof v === 'number' && v > 0,
      unitPrice: (v: any) => typeof v === 'string' && parseFloat(v) > 0,
      discountDisplay: (v: any) => typeof v === 'string',
      taxDisplay: (v: any) => typeof v === 'string',
      discountRate: (v: any) => typeof v === 'string',
      discountAmount: (v: any) => typeof v === 'string' && !isNaN(parseFloat(v)),
      taxRate: (v: any) => typeof v === 'string',
      taxAmount: (v: any) => typeof v === 'string' && !isNaN(parseFloat(v)),
      priceWithTax: (v: any) => typeof v === 'string' && parseFloat(v) > 0
    },
    customers: {
      id: (v: any) => typeof v === 'string' && v.startsWith('CUST_'),
      name: (v: any) => typeof v === 'string' && v.length > 0,
      phoneNumber: (v: any) => typeof v === 'string' && v.length > 0,
      totalPurchaseAmount: (v: any) => typeof v === 'number' && v >= 0
    }
  };

  const result = Object.entries(typeValidators).every(([section, validators]) => {
    const sectionValid = data[section]?.every((item: any) => {
      const fieldResults = Object.entries(validators).map(([field, validator]) => ({
        field,
        valid: validator(item[field]),
        value: item[field]
      }));
      
      console.log(`Validation - ${section} item validation:`, fieldResults);
      return fieldResults.every(r => r.valid);
    });
    
    return sectionValid;
  });

  console.log('Validation - Final result:', result);
  return result;
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
