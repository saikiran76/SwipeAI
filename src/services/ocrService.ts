import Tesseract from 'tesseract.js';
import { ExtractedData } from '../utils/types';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const processWithOCR = async (fileContent: string, fileType: string): Promise<ExtractedData> => {
  if (fileType === 'application/pdf') {
    const formData = new FormData();
    formData.append('file', new Blob([fileContent], { type: fileType }));
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/process-pdf`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to process PDF');
      }
      
      const data = await response.json();
      return validateExtractedData(data);
    } catch (error) {
      console.error('PDF processing error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to process PDF');
    }
  }

  // Handle image files directly in browser
  if (fileType.startsWith('image/')) {
    try {
      // Convert base64 string to Blob properly
      const base64Data = fileContent.split(',')[1];
      const binaryData = atob(base64Data);
      const array = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        array[i] = binaryData.charCodeAt(i);
      }
      const imageBlob = new Blob([array], { type: fileType });

      const { data: { text } } = await Tesseract.recognize(
        imageBlob,
        'eng',
        {
          logger: m => console.log(m)
        }
      );
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text extracted from image');
      }
      
      return parseExtractedText(text);
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error('Failed to process image');
    }
  }

  throw new Error('Unsupported file type');
};

const parseExtractedText = (text: string): ExtractedData => {
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line);
    
  const taxAmount = findTaxAmount(lines);
  const totalAmount = findTotalAmount(lines);
  const unitPrice = findUnitPrice(lines);
  const quantity = findQuantity(lines);
  
  // Use tax amount from document or calculate if missing
  const tax = taxAmount || calculateProductTax(unitPrice * quantity);
  
  const invoice = {
    id: `INV_${uuidv4()}`,
    serialNumber: findInvoiceNumber(lines),
    customerId: `CUST_${uuidv4()}`,
    productId: `PROD_${uuidv4()}`,
    quantity,
    tax,
    totalAmount: totalAmount || (unitPrice * quantity + tax),
    date: findDate(lines)
  };

  const product = {
    id: invoice.productId,
    name: findProductName(lines),
    quantity: invoice.quantity,
    unitPrice,
    tax: invoice.tax,
    priceWithTax: totalAmount
  };

  const customer = {
    id: invoice.customerId,
    name: findPartyName(lines),
    phoneNumber: findPhoneNumber(lines),
    totalPurchaseAmount: totalAmount
  };

  return {
    invoices: [invoice],
    products: [product],
    customers: [customer]
  };
};

const validateExtractedData = (data: any): ExtractedData => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data format');
  }

  if (!Array.isArray(data.invoices) || !Array.isArray(data.products) || !Array.isArray(data.customers)) {
    throw new Error('Missing required data sections');
  }

  return data as ExtractedData;
};

// Updated helper functions
const findQuantity = (lines: string[]): number => {
  const qtyLine = lines.find(line => /quantity|qty/i.test(line));
  return parseInt(qtyLine?.match(/\d+/)?.[0] || '1', 10);
};

const findUnitPrice = (lines: string[]): number => {
  const priceLine = lines.find(line => /unit\s*price|price\s*per/i.test(line));
  return parseFloat(priceLine?.match(/[\d,]+\.?\d*/)?.[0] || '0');
};

const findTaxAmount = (lines: string[]): number => {
  const taxLine = lines.find(line => /(?:gst|tax)\s+amount|total\s+tax/i.test(line));
  const amount = taxLine?.match(/(?:rs\.?|inr)?\s*([\d,]+\.?\d*)/i)?.[1] || '0';
  return parseFloat(amount.replace(/,/g, ''));
};

const findProductName = (lines: string[]): string => {
  // Skip lines containing metadata like "ITEMS/QTY"
  const productLine = lines.find(line => 
    /item|product|description/i.test(line) && 
    !/items\/qty|quantity|total/i.test(line)
  );
  return productLine?.replace(/(?:item|product|description)s?:?\s*/i, '').trim() || 'Unknown Product';
};

const findPhoneNumber = (lines: string[]): string => {
    const phoneLine = lines.find((line) => /phone|tel|mobile/i.test(line));
    const match = phoneLine?.match(/(?:\+91\s*|0)?\d{10}/); // Handle numbers with or without country code
    return match?.[0] || '0000000000';
};
  

// Keep existing helper functions but remove unused ones
const findInvoiceNumber = (lines: string[]): string => {
  const invoiceLine = lines.find(line => /invoice|bill|inv/i.test(line));
  const match = invoiceLine?.match(/(?:invoice|bill|inv)[^\d]*([\w/-]+)/i);
  return match?.[1] || 'unknown';
};

const findDate = (lines: string[]): string => {
  const dateLine = lines.find(line => 
    /date|dt/i.test(line) && 
    /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{2,4}/i.test(line)
  );
  const match = dateLine?.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{2,4})/i);
  return match?.[1] || 'unknown';
};

const findTotalAmount = (lines: string[]): number => {
  const totalLine = lines.find(line => /total\s+amount|grand\s+total|net\s+amount/i.test(line));
  const amount = totalLine?.match(/(?:rs\.?|inr)?\s*([\d,]+\.?\d*)/i)?.[1] || '0';
  return parseFloat(amount.replace(/,/g, ''));
};

const findPartyName = (lines: string[]): string => {
  const partyLine = lines.find(line => 
    /bill\s+to|customer|client|party\s+name/i.test(line) && 
    !/unknown|items\/qty/i.test(line)
  );
  return partyLine?.replace(/(?:bill\s+to|customer|client|party\s+name):?\s*/i, '').trim() || 'unknown';
};

const validateAndNormalizePdfData = (data: ParsedData[]): ParsedData[] => {
    return data.map((row) => ({
        description: row.description || "Unknown",
        quantity: row.quantity || 0,
        rate: row.rate || 0,
        amount: row.amount || 0,
    }));
};

interface ParsedData {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
}


export const parsePdf = async (file: File): Promise<any> => {
    try {
        const pdfParse = await import('pdf-parse'); // Dynamically import the module
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Buffer
        const pdfText = await pdfParse.default(buffer); // Use the default export dynamically

        const structuredData = extractDataFromPdfText(pdfText.text);
        return validateAndNormalizePdfData(structuredData);
    } catch (error) {
        console.error("PDF Parsing Error: ", error);
        throw new Error("Failed to parse PDF. Ensure format is correct.");
    }
};



// New function to process PDF text into structured data
const extractDataFromPdfText = (text: string): ParsedData[] => {
    const lines = text.split("\n");
    let extractedData: ParsedData[] = [];

    lines.forEach((line) => {
        const match = line.match(/regex-pattern-for-table-rows/); // Replace with suitable regex
        if (match) {
            extractedData.push({
                description: match[1],
                quantity: parseFloat(match[2]),
                rate: parseFloat(match[3]),
                amount: parseFloat(match[4]),
            });
        }
    });

    return extractedData;
};

const calculateProductTax = (price: number, taxRate: number = 0.18): number => {
  return price * taxRate;
};



