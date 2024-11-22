import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateExtractedData } from './geminiService';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { Invoice } from '../utils/types';
import { Customer } from '../utils/types';
import { Product } from '../utils/types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const getModel = async () => {
    try {
        return await genAI.getGenerativeModel({
            model: 'gemini-1.5-flash', // or gemini-1.5-flash if resources are limited
            generationConfig: {
                temperature: 0.2, // Lower temperature for more focused, factual extraction
                topP: 0.8,       // Adjust as needed for diversity vs. focus
                maxOutputTokens: 2048, // Limit the response length to avoid excessive computation
            }
        });
    } catch (error) {
        console.error("Error creating Gemini model:", error);
        throw new Error("Failed to initialize Gemini model");
    }
};

const REQUIRED_FIELDS = [
  'Invoice number',
  'Date',
  'Total amount',
  'Total Tax Rate',
  'Total Tax Amount',
  'Product names',
  'Unit Amount',
  'Quantity',
  'Price with tax',
  'Tax amount per product',
  'Tax rate per product',
  'Discount rate per product',
  'Discount amount per product',
  'Party name',
  'Company name',
  'Mobile number/Phone number/MOBILE',
  'Email',
  'Address',
];

interface ExtractedData {
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
}

const parseNumber = (value: string | number | null | undefined): number => {
  if (value == null) return 0;
  return parseFloat(String(value).replace(/[^0-9.-]+/g, '')) || 0;
};


const validateAndHandleMissingFields = (rawData: any): GeminiResponse[] => {
  if (!Array.isArray(rawData)) {
    rawData = [rawData];
  }

  return rawData.map((data: any) => {
    const validatedData: any = { ...data };

    // Ensure all required fields are present
    REQUIRED_FIELDS.forEach(field => {
      if (!(field in validatedData)) {
        validatedData[field] = ['Product names', 'Unit Amount', 'Quantity', 'Price with tax', 'Tax amount per product', 'Tax rate per product', 'Discount rate per product', 'Discount amount per product'].includes(field) ? [] : 'unknown';
      }
    });

    // List of fields that should be arrays
    const arrayFields = [
      'Product names',
      'Unit Amount',
      'Quantity',
      'Price with tax',
      'Tax amount per product',
      'Tax rate per product',
      'Discount rate per product',
      'Discount amount per product',
    ];

    // Ensure all array fields are arrays and have the same length
    const maxLength = Math.max(
      ...arrayFields.map((field) => {
        const fieldValue = validatedData[field];
        if (Array.isArray(fieldValue)) {
          return fieldValue.length;
        } else if (fieldValue !== undefined && fieldValue !== null) {
          validatedData[field] = [fieldValue];
          return 1;
        } else {
          validatedData[field] = [];
          return 0;
        }
      })
    );

    // Normalize array lengths and fill missing values with defaults
    arrayFields.forEach((field) => {
      const fieldArray = validatedData[field];
      if (fieldArray.length < maxLength) {
        const fillValue = ['Product names'].includes(field) ? 'unknown' : '0';
        validatedData[field] = [
          ...fieldArray,
          ...Array(maxLength - fieldArray.length).fill(fillValue),
        ];
      }
    });

    // Normalize numeric fields
    ['Total amount', 'Total Tax Rate', 'Total Tax Amount'].forEach((field) => {
      validatedData[field] = parseFloat(
        String(validatedData[field] || '0').replace(/[^0-9.-]/g, '')
      ) || 0;
    });

    // Normalize string fields
    ['Invoice number', 'Date', 'Party name', 'Company name', 'Email', 'Address'].forEach((field) => {
      validatedData[field] = validatedData[field] || 'unknown';
    });

    return validatedData;
  });
};

export interface GeminiResponse {
  'Invoice number': string;
  'Date': string;
  'Total amount': string;
  'Total Tax Rate': string;
  'Total Tax Amount': string;
  'Product names': string[];
  'Unit Amount': string[];
  'Quantity': string[];
  'Price with tax': string[];
  'Tax amount per product': string[];
  'Tax rate per product': string[];
  'Discount rate per product': string[];
  'Discount amount per product': string[];
  'Party name': string;
  'Company name': string;
  'Mobile number/Phone number/MOBILE': string;
  'Email': string;
  'Address': string;
}

const transformGeminiResponse = (rawData: GeminiResponse[]): ExtractedData => {
  try {
    const dataArray = Array.isArray(rawData) ? rawData[0] : rawData;
    const customerId = `CUST_${uuidv4()}`;

    // Extract global tax rate from the input
    const totalTaxRateMatch = String(dataArray['Total Tax Rate']).match(/(\d+(\.\d+)?)%?/);
    const globalTaxRate = totalTaxRateMatch ? parseFloat(totalTaxRateMatch[1]) : 0;
    console.log('Global Tax Rate extracted:', globalTaxRate);

    const totalTaxAmount = parseNumber(dataArray['Total Tax Amount']);
    const totalAmount = parseNumber(dataArray['Total amount']);

    const products: Product[] = [];
    const invoices: Invoice[] = [];
    const numberOfProducts = dataArray['Product names'].length;

    // Calculate total of "Price with tax" to determine proportions
    const totalPriceWithTax = dataArray['Price with tax'].reduce((sum, price) => sum + parseNumber(price), 0);

    // Distribute total tax amount proportionally based on "Price with tax"
    for (let index = 0; index < numberOfProducts; index++) {
      const id = `PROD_${uuidv4()}`;
      const unitPrice = parseNumber(dataArray['Unit Amount'][index]);
      const quantity = parseNumber(dataArray['Quantity'][index]) || 1;
      const priceWithTax = parseNumber(dataArray['Price with tax'][index]);

      // Calculate discount amount
      const discountAmount = unitPrice * quantity - priceWithTax;
      const discountRate = (discountAmount / (unitPrice * quantity)) * 100;

      // Calculate tax amount proportionally
      const priceProportion = priceWithTax / totalPriceWithTax;
      const taxAmount = parseFloat((totalTaxAmount * priceProportion).toFixed(2));

      // Adjust price before tax
      // const priceBeforeTax = priceWithTax - taxAmount;

      // Create product
      const product: Product = {
        id,
        name: dataArray['Product names'][index] || 'Unknown Product',
        quantity,
        unitPrice: unitPrice.toFixed(2),
        discountRate: discountRate.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        taxRate: globalTaxRate > 0 ? globalTaxRate.toFixed(2) : '0',
        taxAmount: taxAmount.toFixed(2),
        priceWithTax: priceWithTax.toFixed(2),
        discountDisplay: formatDiscountString(discountRate, discountAmount),
        taxDisplay: formatTaxString(globalTaxRate, taxAmount),
      };
      
      
      products.push(product);

      // Create invoice
      const invoice: Invoice = {
        id: `INV_${uuidv4()}`,
        serialNumber: dataArray['Invoice number']
          ? `${dataArray['Invoice number']}-${index + 1}`
          : `INV-${index + 1}`,
        customerId: customerId,
        productId: product.id,
        quantity: product.quantity,
        tax: taxAmount,
        totalAmount: priceWithTax,
        date: dataArray['Date'] || new Date().toISOString().split('T')[0],
      };
      invoices.push(invoice);
    }

    const customer: Customer = {
      id: customerId,
      name:
        dataArray['Party name'] && dataArray['Party name'] !== 'unknown'
          ? dataArray['Party name']
          : '-',
      phoneNumber:
        dataArray['Mobile number/Phone number/MOBILE'] &&
        dataArray['Mobile number/Phone number/MOBILE'] !== 'unknown'
          ? dataArray['Mobile number/Phone number/MOBILE']
          : '-',
      email:
        dataArray['Email'] && dataArray['Email'] !== 'unknown' ? dataArray['Email'] : '-',
      address:
        dataArray['Address'] && dataArray['Address'] !== 'unknown' ? dataArray['Address'] : '-',
      totalPurchaseAmount: totalAmount,
    };

    return {
      invoices,
      products,
      customers: [customer],
    };
  } catch (error) {
    console.error('Gemini - Transform error:', error);
    throw new Error('Failed to transform data structure');
  }
};

// Helper functions for precise formatting
const formatDiscountString = (rate: number, amount: number): string => {
  if (rate > 0 && amount > 0) return `${rate}%(-${amount.toFixed(2)})`;
  if (rate > 0) return `${rate}%`;
  if (amount > 0) return `(-${amount.toFixed(2)})`;
  return '';
};

const formatTaxString = (rate: number, amount: number): string => {
  if (rate > 0 && amount > 0) return `${rate}%(${amount.toFixed(2)})`;
  if (rate > 0) return `${rate}%`;
  if (amount > 0) return amount.toFixed(2);
  return '';
};

const sanitizeGeminiResponse = (response: string): string => {
  try {
      const startIndex = response.indexOf('{');
      const endIndex = response.lastIndexOf('}');
      
      if (startIndex === -1 || endIndex === -1) {
          throw new Error('No JSON object found in response');
      }
      
      const jsonString = response.substring(startIndex, endIndex + 1);

      // Remove any trailing commas before closing braces
      const cleanedJsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

      // Remove any non-JSON text before and after the JSON object
      const jsonMatch = cleanedJsonString.match(/{[\s\S]*}/);
      if (!jsonMatch) {
          throw new Error('No valid JSON object found');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      REQUIRED_FIELDS.forEach(field => {
          if (!(field in parsed)) {
              parsed[field] = ['Product names', 'Unit Amount', 'Quantity', 'Price with tax'].includes(field) ? [] : 'unknown';
          }
      });

      return JSON.stringify(parsed);
  } catch (error) {
      console.error('Error sanitizing response:', error);
      return JSON.stringify({
          'Invoice number': 'unknown',
          'Date': new Date().toISOString().split('T')[0],
          'Total amount': '0',
          'Product names': [],
          'Unit Amount': [],
          'Quantity': [],
          'Price with tax': [],
          'Tax amount': '0',
          'Party name': 'unknown',
          'Company name': 'unknown',
          'Mobile number/Phone number/MOBILE': '0000000000'
      });
  }
};

const buildGeminiPrompt = () => ({
  text: `You are an AI assistant that extracts key information from invoices. Your task is to accurately extract the following fields and return them in the exact JSON format provided. Ensure that all array fields are aligned so that each index corresponds to the same product across all arrays. Do not include any extra text or explanations. If certain fields are missing, use "unknown" or "0" as appropriate.

{
  "Invoice number": "string",
  "Date": "string",
  "Total amount": "string",
  "Total Tax Rate": "string",
  "Total Tax Amount": "string",
  "Product names": ["string"],
  "Unit Amount": ["string"],
  "Quantity": ["string"],
  "Price with tax": ["string"],
  "Tax amount per product": ["string"],
  "Tax rate per product": ["string"],
  "Discount rate per product": ["string"],
  "Discount amount per product": ["string"],
  "Party name": "string",
  "Company name": "string",
  "Mobile number/Phone number/MOBILE": "string",
  "Email": "string",
  "Address": "string"
}

Guidelines:
- **Tax Rate and Amount Extraction:**
  - Extract the overall tax rate (e.g., "IGST 18%") as "Total Tax Rate".
  - Extract the total tax amount as "Total Tax Amount".
  - Extract the tax rate for each product if available as "Tax rate per product".
  - Extract the tax amount for each product as "Tax amount per product".
  - If the tax rate or amount per product is not explicitly mentioned, leave it as "unknown" or "0".

- **Discount Extraction:**
  - Extract the discount rate and amount for each product as "Discount rate per product" and "Discount amount per product".

- **Email Field:**
  - Extract the email address if present. If not, use "unknown".

- **General Instructions:**
  - Use double quotes for all strings.
  - Ensure numeric values are represented as strings.
  - Do not include any additional commentary or data.
  - If a product does not have a tax rate or discount, use "0" or "unknown" at the corresponding index.

- **Data Alignment:**
  - Each element in the arrays must correspond to the same product across all arrays.
`,
});

const calculatePriceAfterDiscount = (price: number, discount: number): number => {
  if (discount >= 1) {
    return Math.max(0, price - discount);
  }
  return price * (1 - discount);
};

const calculateProductTax = (price: number, taxRate: number = 0.18): number => {
  return price * taxRate;
};

export const extractDataFromDocument = async (fileContent: string, fileType: string) => {
  try {
    if (fileType.includes('excel')) {
      const workbook = XLSX.read(fileContent, { type: 'binary' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const excelData = XLSX.utils.sheet_to_json(firstSheet);
      
      if (!Array.isArray(excelData) || excelData.length === 0) {
        throw new Error('No data found in Excel file');
      }

      // Transform Excel data with better field mapping
      const transformedData = excelData.map((row: any) => {
        const productName = row['Product'] || row['Item'] || row['Description'] || 'Unknown Product';
        const quantity = Number(row['Quantity'] || row['Qty'] || 1);
        const unitPrice = Number(row['Unit Price'] || row['Rate'] || 0);
        const discount = Number(row['Discount'] || row['Disc'] || 0);
        
        const priceBeforeDiscount = quantity * unitPrice;
        const priceAfterDiscount = calculatePriceAfterDiscount(priceBeforeDiscount, discount);
        const tax = calculateProductTax(priceAfterDiscount);
        const total = priceAfterDiscount + tax;

        return {
          'Invoice number': row['Invoice No'] || row['Bill No'] || row['Serial No'] || `INV-${Date.now()}`,
          'Date': row['Date'] || row['Invoice Date'] || new Date().toISOString().split('T')[0],
          'Total amount': String(total),
          'Product names': [productName],
          'Unit Amount': [String(unitPrice)],
          'Quantity': [quantity],
          'Price with tax': [String(total)],
          'Tax amount': String(tax),
          'Party name': row['Customer'] || row['Party'] || row['Client'] || 'Unknown Customer',
          'Company name': row['Company'] || row['Vendor'] || 'Unknown Company'
        };
      });

      const validatedData = validateAndHandleMissingFields(transformedData);
      const transformedResponse = transformGeminiResponse(validatedData);
      
      return validateExtractedData({
        invoices: transformedResponse.invoices || [],
        products: transformedResponse.products || [],
        customers: transformedResponse.customers || []
      });
    }

    // Handle PDF/Image files
    const model = await getModel();
    const parts = [];
    
    if (fileType.includes('image') || fileType === 'application/pdf') {
      parts.push({
        inlineData: {
          data: fileContent.split(',')[1],
          mimeType: fileType
        }
      } as const);
      
      parts.push(buildGeminiPrompt());

      const result = await model.generateContent(parts);
      const response = result.response.text();
      console.log('Raw Gemini response:', response); // For debugging

      try {
        const sanitizedResponse = sanitizeGeminiResponse(response);
        console.log('Sanitized response:', sanitizedResponse); // For debugging
        const rawData = JSON.parse(sanitizedResponse);
        const validatedData = validateAndHandleMissingFields([rawData]);
        const transformedResponse = transformGeminiResponse(validatedData);
        
        if (!transformedResponse.invoices?.length) {
          throw new Error('No invoice data extracted');
        }

        return validateExtractedData(transformedResponse);
      } catch (error) {
        console.error('Data extraction error:', error);
        // Return default structure instead of throwing
        return validateExtractedData({
          invoices: [],
          products: [],
          customers: []
        });
      }
    }
  } catch (error) {
    console.error('Processing error:', error);
    throw error;
  }
};