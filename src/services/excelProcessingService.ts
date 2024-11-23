import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { Invoice, Product, Customer } from '../utils/types';

interface ProcessedExcelData {
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
}

const REQUIRED_FIELDS = [
  'Invoice Date',
  'Invoice Number',
  'Customer Name',
  'Customer Phone',
  'Customer Email',
  'Customer Address',
  'Product Name',
  'Quantity',
  'Unit Price',
  'Tax Rate',
  'Tax Amount',
  'Total Amount',
];

const validateExcelHeaders = (headers: string[]) => {
  const missingFields = REQUIRED_FIELDS.filter((field) => !headers.includes(field));
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields in Excel file: ${missingFields.join(', ')}`);
  }
};

const parseExcelFile = (fileContent: ArrayBuffer): any[] => {
  const workbook = XLSX.read(fileContent, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 'A' });
};

const transformExcelData = (data: any[]): ProcessedExcelData => {
  const customersMap = new Map<string, Customer>();
  const invoices: Invoice[] = [];
  const products: Product[] = [];

  data.forEach((row: any) => {
    const {
      'Invoice Date': date,
      'Invoice Number': serialNumber,
      'Customer Name': customerName,
      'Customer Phone': phoneNumber,
      'Customer Email': email,
      'Customer Address': address,
      'Product Name': productName,
      Quantity: quantity,
      'Unit Price': unitPrice,
      'Tax Rate': taxRate,
      'Tax Amount': taxAmount,
      'Total Amount': totalAmount,
    } = row;

    if (!customerName) {
      throw new Error('Customer name is required for each row.');
    }

    // Add or update the customer
    if (!customersMap.has(customerName)) {
      customersMap.set(customerName, {
        id: `CUST_${uuidv4()}`,
        name: customerName,
        phoneNumber: phoneNumber || '0000000000',
        email: email || 'unknown',
        address: address || 'unknown',
        totalPurchaseAmount: 0,
      });
    }

    const customer = customersMap.get(customerName)!;

    // Add an invoice
    const invoiceId = `INV_${uuidv4()}`;
    invoices.push({
      id: invoiceId,
      serialNumber,
      customerId: customer.id,
      productId: `PROD_${uuidv4()}`, // Will be updated later
      quantity: Number(quantity) || 0,
      taxRate: Number(taxRate) || 0,
      taxAmount: Number(taxAmount) || 0,
      totalAmount: Number(totalAmount.replace(',', '').trim()) || 0,
      date,
      customerName: customer.name,
    });

    // Add a product
    products.push({
      id: `PROD_${uuidv4()}`,
      name: productName as string,
      unitPrice: String(parseFloat(unitPrice).toFixed(2)) as string,
      taxRate: String(Number(taxRate)) || '0',
      taxDisplay: formatTaxString(taxRate, taxAmount),
      discountDisplay: formatDiscountString('0', '0'),
      taxAmount: String(Number(taxAmount)) || '0',
      quantity: Number(quantity) || 0,
      priceWithTax: String((Number(unitPrice) * (1 + Number(taxRate) / 100)).toFixed(2)),
      discountRate: '0', // Can be updated later if discount info is provided
      discountAmount: '0', // Can be updated later if discount info is provided
    });

    // Update customer's total purchase amount
    customer.totalPurchaseAmount += parseFloat(totalAmount);
  });

  return {
    invoices,
    products,
    customers: Array.from(customersMap.values()),
  };
};

const formatTaxString = (rate: string, amount: string): string => {
    return `${rate}% (₹${amount})`;
};

const formatDiscountString = (rate: string, amount: string): string => {
    return `${rate}% (-₹${amount})`;
};

export const processExcelFile = async (file: File): Promise<ProcessedExcelData> => {
  try {
    const fileContent = await file.arrayBuffer();
    const parsedData = parseExcelFile(fileContent);

    if (parsedData.length === 0) {
      throw new Error('Excel file is empty or incorrectly formatted.');
    }

    validateExcelHeaders(Object.keys(parsedData[0]));
    return transformExcelData(parsedData);
  } catch (error: any) {
    throw new Error(`Failed to process Excel file: ${error.message}`);
  }
};
