// documentProcessor.ts

import tesseract from 'node-tesseract-ocr';
import sharp from 'sharp';
import pdfParse from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';

// Define interfaces

interface Product {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string; // Stored as string to maintain precision
  discountDisplay: string;
  taxDisplay: string;
  discountRate: string;
  discountAmount: string;
  taxRate: string;
  taxAmount: string;
  priceWithTax: string;
}

interface Invoice {
  id: string;
  serialNumber: string;
  customerId: string;
  productId: string;
  quantity: number;
  tax: number;
  totalAmount: number;
  date: string;
}

interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  totalPurchaseAmount: number;
}

interface ExtractedData {
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
}

// Exported function to process files
export const processFile = async (fileBuffer: Buffer, fileType: string): Promise<ExtractedData> => {
  if (fileType === 'application/pdf') {
    return processPdf(fileBuffer);
  } else if (fileType.startsWith('image/')) {
    return processImage(fileBuffer);
  } else {
    throw new Error('Unsupported file type');
  }
};

// Function to process image files
const processImage = async (imageBuffer: Buffer): Promise<ExtractedData> => {
  try {
    // Preprocess the image
    const preprocessedImageBuffer = await preprocessImage(imageBuffer);

    // Perform OCR
    const text: string = await tesseract.recognize(preprocessedImageBuffer, {
      lang: 'eng',
      psm: 6,
    });

    if (!text || text.trim().length === 0) {
      throw new Error('No text extracted from image');
    }

    // Parse the extracted text
    return parseExtractedText(text);
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};

// Function to preprocess images
const preprocessImage = async (imageBuffer: Buffer): Promise<Buffer> => {
  try {
    const preprocessedImage = await sharp(imageBuffer)
      .grayscale()
      .sharpen()
      .threshold(128)
      .normalize()
      .toBuffer();
    return preprocessedImage;
  } catch (error) {
    console.error('Error preprocessing image:', error);
    throw error;
  }
};

// Function to process PDF files
const processPdf = async (pdfBuffer: Buffer): Promise<ExtractedData> => {
  try {
    const data = await pdfParse(pdfBuffer);

    const text: string = data.text;

    if (!text || text.trim().length === 0) {
      throw new Error('No text extracted from PDF');
    }

    // Parse the extracted text
    return parseExtractedText(text);
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error;
  }
};

// Function to parse the extracted text
const parseExtractedText = (text: string): ExtractedData => {
  console.log('Extracted Text:', text);

  const lines: string[] = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line);

  console.log('Parsed Lines:', lines);

  const invoiceNumber: string = findInvoiceNumber(lines);
  const date: string = findDate(lines);
  const totalAmount: number = findTotalAmount(lines);
  const totalTaxAmount: number = findTotalTaxAmount(lines);
  const taxRate: number = findTaxRate(lines);
  const customerName: string = findPartyName(lines);
  const phoneNumber: string = findPhoneNumber(lines);
  const products: Product[] = parseProducts(lines);

  if (products.length === 0) {
    console.error('No products found. Please check the OCR output and parsing logic.');
    throw new Error('No products found in the invoice.');
  }

  // Use a single customerId for all invoices
  const customerId: string = `CUST_${uuidv4()}`;

  // Calculate total product amount before tax distribution
  const totalProductAmount: number = products.reduce(
    (sum, product) => sum + parseFloat(product.priceWithTax),
    0
  );

  // Distribute tax amount proportionally
  products.forEach((product) => {
    const currentPrice: number = parseFloat(product.priceWithTax);
    const proportionalTax: number = (currentPrice / totalProductAmount) * totalTaxAmount;

    // Update product fields
    product.taxRate = taxRate.toString();
    product.taxAmount = proportionalTax.toFixed(2);
    product.priceWithTax = (currentPrice + proportionalTax).toFixed(2);

    // Update display strings
    product.taxDisplay = formatTaxString(
      parseFloat(product.taxRate),
      parseFloat(product.taxAmount)
    );
  });

  // Log calculations for debugging
  console.log('Tax distribution:', {
    totalProductAmount,
    totalTaxAmount,
    products: products.map((p) => ({
      name: p.name,
      price: p.priceWithTax,
      tax: p.taxAmount,
      taxRate: p.taxRate,
    })),
  });

  const invoices: Invoice[] = products.map((product, index) => ({
    id: `INV_${uuidv4()}`,
    serialNumber: `${invoiceNumber}-${index + 1}`,
    customerId: customerId,
    productId: product.id,
    quantity: product.quantity,
    tax: parseFloat(product.taxAmount),
    totalAmount: parseFloat(product.priceWithTax),
    date: date,
  }));

  const customer: Customer = {
    id: customerId,
    name: customerName,
    phoneNumber: phoneNumber || '0000000000',
    email: '', // Add email extraction if possible
    address: '', // Add address extraction if possible
    totalPurchaseAmount: totalAmount,
  };

  return {
    invoices,
    products,
    customers: [customer],
  };
};

// Helper function to format tax display strings
const formatTaxString = (rate: number, amount: number): string => {
  if (rate > 0 && amount > 0) return `${rate}% (${amount.toFixed(2)})`;
  if (rate > 0) return `${rate}%`;
  if (amount > 0) return amount.toFixed(2);
  return '';
};

// Function to find the invoice number
const findInvoiceNumber = (lines: string[]): string => {
  const invoicePatterns: RegExp[] = [
    /INVOICE\s*NO\.?\s*[:\s]*([\w/-]+)/i,
    /BILL\s*NO\.?\s*[:\s]*([\w/-]+)/i,
    /INVOICE\s*#[:\s]*([\w/-]+)/i,
    /BILL\s*#[:\s]*([\w/-]+)/i,
  ];

  for (const line of lines) {
    for (const pattern of invoicePatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1];
      }
    }
  }
  return 'unknown';
};

// Function to find the date
const findDate = (lines: string[]): string => {
  const datePatterns: RegExp[] = [
    /DATE[:\s]*([\d/.-]+)/i,
    /DATE[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /DATE[:\s]*([\d]{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1];
      }
    }
  }
  return new Date().toISOString().split('T')[0];
};

// Function to find the total amount
const findTotalAmount = (lines: string[]): number => {
  const totalPatterns: RegExp[] = [
    /TOTAL\s+AMOUNT[:\s]*\$?\s*([\d,]+\.\d+)/i,
    /TOTAL[:\s]*\$?\s*([\d,]+\.\d+)/i,
    /AMOUNT\s+DUE[:\s]*\$?\s*([\d,]+\.\d+)/i,
    /TOTAL AMOUNT[:\s]*Rs\.?\s*([\d,]+\.\d+)/i, // Include Rs for rupees
  ];

  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        return parseFloat(match[1].replace(/,/g, ''));
      }
    }
  }
  return 0;
};

// Function to find the total tax amount
const findTotalTaxAmount = (lines: string[]): number => {
  const taxPatterns: RegExp[] = [
    /TOTAL\s+TAX[:\s]*\$?\s*([\d,]+\.\d+)/i,
    /TAX[:\s]*\$?\s*([\d,]+\.\d+)/i,
    /IGST\s+\d+\.?\d*%\s*Rs\.?\s*([\d,]+\.\d+)/i,
    /GST\s+\d+\.?\d*%\s*Rs\.?\s*([\d,]+\.\d+)/i,
    /IGST\s+\d+\.?\d*%\s*Rs\.?\s*([\d,]+)/i,
    /GST\s+\d+\.?\d*%\s*Rs\.?\s*([\d,]+)/i,
  ];

  for (const line of lines) {
    for (const pattern of taxPatterns) {
      const match = line.match(pattern);
      if (match) {
        return parseFloat(match[1].replace(/,/g, ''));
      }
    }
  }
  return 0;
};

// Function to find the tax rate
const findTaxRate = (lines: string[]): number => {
  const taxRatePatterns: RegExp[] = [
    /TAX\s+RATE[:\s]*([\d.]+)%/i,
    /IGST\s+([\d.]+)%/i,
    /GST\s+([\d.]+)%/i,
  ];

  for (const line of lines) {
    for (const pattern of taxRatePatterns) {
      const match = line.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }
  }
  return 0;
};

// Function to find the customer's name
const findPartyName = (lines: string[]): string => {
  const namePatterns: RegExp[] = [
    /(?:BILL\s+TO|CUSTOMER|CLIENT|NAME)[:\s]*([\w\s]+)/i,
    /TO[:\s]*([\w\s]+)/i,
  ];

  for (const line of lines) {
    for (const pattern of namePatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
  }
  return 'unknown';
};

// Function to find the customer's phone number
const findPhoneNumber = (lines: string[]): string => {
  const phonePatterns: RegExp[] = [
    /PHONE[:\s]*(\+?\d{10,15})/i,
    /MOBILE[:\s]*(\+?\d{10,15})/i,
    /CONTACT[:\s]*(\+?\d{10,15})/i,
  ];

  for (const line of lines) {
    for (const pattern of phonePatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1];
      }
    }
  }
  return '';
};

// Helper function to check if two strings are similar (to account for OCR errors)
const isSimilar = (str1: string, str2: string): boolean => {
  const normalize = (str: string): string => str.toLowerCase().replace(/[^a-z]/g, '');
  return normalize(str1) === normalize(str2);
};

// Function to parse product lines
const parseProducts = (lines: string[]): Product[] => {
  const products: Product[] = [];

  // Identify product section
  const productSectionHeaders: RegExp[] = [
    /ITEM\s+DESCRIPTION/i,
    /DESCRIPTION/i,
    /PRODUCT/i,
    /ITEM\s+NAME/i,
    /ITEM NAME/i,
    /ITEMS/i,
    /DETAILS/i,
  ];

  let startIndex: number = -1;
  for (const header of productSectionHeaders) {
    startIndex = lines.findIndex((line) => header.test(line));
    if (startIndex !== -1) break;
  }

  if (startIndex === -1) {
    console.warn('Could not find the start of the products section.');
    console.log('Lines:', lines);
    return products;
  }

  console.log('Products start at line:', startIndex, 'Content:', lines[startIndex]);

  // Attempt to identify column headers
  let columnHeaders = lines[startIndex + 1]?.split(/\s+/);
  const expectedColumns = ['Qty', 'Price', 'Amount'];

  // Check if the next line contains expected columns
  let headerLineIndex = startIndex + 1;
  if (
    columnHeaders &&
    expectedColumns.every((col) => columnHeaders.includes(col) || columnHeaders.some((header) => isSimilar(header, col)))
  ) {
    startIndex = headerLineIndex + 1;
  } else {
    startIndex = headerLineIndex;
  }

  // Proceed to parse products
  for (let i = startIndex; i < lines.length; i++) {
    let line = lines[i];

    // Break if end of products section
    if (/SUBTOTAL|TOTAL|THANK YOU|GST|IGST|CGST|SGST/i.test(line)) break;

    if (!line.trim()) continue;

    // Attempt to parse product line
    // Use regex to extract numbers and words
    const qtyMatch = line.match(/(\d+(\.\d+)?)/);
    const priceMatches = line.match(/(\d{1,3}(,\d{3})*(\.\d+)?)/g);

    let quantity: number = 1;
    let unitPrice: number = 0;
    let amount: number = 0;
    let description: string = line;

    if (qtyMatch && priceMatches && priceMatches.length >= 1) {
      quantity = parseFloat(qtyMatch[1]);
      amount = parseFloat(priceMatches[priceMatches.length - 1].replace(/,/g, ''));
      if (priceMatches.length >= 2) {
        unitPrice = parseFloat(priceMatches[priceMatches.length - 2].replace(/,/g, ''));
      }
      description = line.replace(qtyMatch[0], '').replace(priceMatches.join(' '), '').trim();
    } else {
      // Fallback parsing
      const numbers = line.match(/[\d,]+\.\d+/g);
      if (numbers && numbers.length >= 1) {
        amount = parseFloat(numbers[numbers.length - 1].replace(/,/g, ''));
        if (numbers.length >= 2) {
          unitPrice = parseFloat(numbers[numbers.length - 2].replace(/,/g, ''));
        }
        description = line.replace(numbers.join(' '), '').trim();
      } else {
        console.warn('Could not parse product line:', line);
        continue;
      }
    }

    products.push({
      id: `PROD_${uuidv4()}`,
      name: description || 'Unknown Product',
      quantity,
      unitPrice: unitPrice.toFixed(2),
      discountDisplay: '', // Update if applicable
      taxDisplay: '', // Will be updated later
      discountRate: '0',
      discountAmount: '0',
      taxRate: '0', // Will be updated later
      taxAmount: '0', // Will be calculated
      priceWithTax: amount.toFixed(2),
    });

    console.log('Parsed Product:', products[products.length - 1]);
  }

  return products;
};
