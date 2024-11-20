import { ExtractedData } from '../types';
import * as fs from 'fs';

export const mockFileData = {
  pdf: new File(['test pdf content'], 'test.pdf', { type: 'application/pdf' }),
  excel: new File(['test excel content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  image: new File(['test image content'], 'test.jpg', { type: 'image/jpeg' })
};

export const mockExtractedData: ExtractedData = {
  invoices: [{
    id: '1',
    serialNumber: 'INV001',
    customerId: 'CUST001',
    productId: 'PROD001',
    quantity: 2,
    tax: 10,
    totalAmount: 220,
    date: '2024-03-20'
  }],
  products: [{
    id: 'PROD001',
    name: 'Test Product',
    quantity: 100,
    unitPrice: 100,
    tax: 10,
    priceWithTax: 110
  }],
  customers: [{
    id: 'CUST001',
    name: 'Test Customer',
    phoneNumber: '1234567890',
    totalPurchaseAmount: 220
  }]
};

export const readFileContent = async (filePath: string): Promise<string> => {
    return fs.promises.readFile(filePath, 'utf-8');
}; 