import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateExtractedData, validateDataTypes } from './geminiService';
import * as XLSX from 'xlsx';
import { buildDataRelationships } from '../utils/dataRelationships';
import { v4 as uuidv4 } from 'uuid';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

//Improved Model Configuration:  More robust error handling and better prompt management.
const getModel = async () => {
    try {
        return await genAI.getGenerativeModel({
            model: 'gemini-1.5-flash', // or gemini-1.5-flash if resources are limited
            generationConfig: {
                temperature: 0.2, // Lower temperature for more focused, factual extraction
                topP: 0.8,       // Adjust as needed for diversity vs. focus
                maxOutputTokens: 500, // Limit the response length to avoid excessive computation
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
  'Product names',
  'Unit Amount',
  'Quantity',
  'Price with tax',
  'Tax amount',
  'Party name',
  'Company name',
];

const validateAndHandleMissingFields = (rawData: any) => {
  if (!Array.isArray(rawData)) {
    rawData = [rawData];
  }

  return rawData.map((data: any) => {
    const validatedData = { ...data };

    // Ensure array fields are properly formatted
    ['Product names', 'Unit Amount', 'Quantity', 'Price with tax'].forEach((field) => {
      if (!Array.isArray(validatedData[field])) {
        validatedData[field] = validatedData[field] ? [validatedData[field]] : [];
      }
      if (field !== 'Product names') {
        validatedData[field] = validatedData[field].map((value: any) =>
          parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0
        );
      }
    });

    // Normalize numeric fields
    ['Total amount', 'Tax amount'].forEach((field) => {
      validatedData[field] = parseFloat(String(validatedData[field] || '0').replace(/[^0-9.-]/g, '')) || 0;
    });

    // Normalize string fields
    ['Invoice number', 'Date', 'Party name', 'Company name'].forEach((field) => {
      validatedData[field] = validatedData[field] || 'unknown';
    });

    console.log("the validated data is", validatedData);

    return validatedData;
  });
};


interface GeminiResponse {
  'Invoice number': string;
  'Date': string;
  'Total amount': string;
  'Product names': string[];
  'Unit Amount': string[];
  'Quantity': (number | string)[];
  'Price with tax': string[];
  'Tax amount': string;
  'Party name': string;
  'Company name': string;
  'Mobile number/Phone number/MOBILE': string;
}

const transformGeminiResponse = (rawData: GeminiResponse[]) => {
  try {
    const dataArray = Array.isArray(rawData) ? rawData[0] : rawData;
    const customerId = `CUST_${uuidv4()}`;
    
    const totalTax = parseFloat(dataArray['Tax amount'] || '0');
    const totalAmount = parseFloat(dataArray['Total amount'] || '0');

    // Create customer first
    const customer = {
      id: customerId,
      name: dataArray['Party name'] || 'unknown',
      phoneNumber: dataArray['Mobile number/Phone number/MOBILE'] || '0000000000', 
      totalPurchaseAmount: totalAmount,
    };

    // Create products with tax and discount calculation
    const productIds = (dataArray['Product names'] || ['Unknown Product']).map(() => `PROD_${uuidv4()}`);
    const products = productIds.map((id, index) => {
      const unitPrice = parseFloat(dataArray['Unit Amount']?.[index] || '0');
      const quantity = Number(dataArray['Quantity']?.[index] || '1');
      const priceWithTax = parseFloat(dataArray['Price with tax']?.[index] || '0');

      const tax = totalTax > 0 ? (totalTax * unitPrice) / totalAmount : 0;
      const discount = priceWithTax > 0 ? unitPrice - (priceWithTax - tax) : 0;
      
      return {
        id,
        name: (dataArray['Product names'] || ['Unknown Product'])[index] || 'Unknown Product',
        quantity,
        unitPrice: unitPrice.toFixed(2),
        tax: tax.toFixed(2),
        discount: discount.toFixed(2),
        priceWithTax: priceWithTax.toFixed(2),
      };
    });

    // Create invoices
    const invoices = productIds.map((productId, index) => ({
      id: `INV_${uuidv4()}`,
      serialNumber: dataArray['Invoice number']
        ? `${dataArray['Invoice number']}-${index + 1}`
        : `INV-${index + 1}`,
      customerId: customer.id,
      productId,
      quantity: Number(dataArray['Quantity']?.[index] || '1'),
      tax: parseFloat(products[index].tax),
      totalAmount: parseFloat(products[index].priceWithTax),
      date: dataArray['Date'] || new Date().toISOString().split('T')[0],
    }));

    return {
      invoices,
      products,
      customers: [customer],
    };
  } catch (error) {
    console.error('Transform error:', error);
    throw new Error('Failed to transform data structure');
  }
};


const sanitizeGeminiResponse = (response: string): string => {
  try {
    // Find the JSON object in the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    let jsonStr = jsonMatch[0];
    
    // Handle incomplete JSON responses
    if (!jsonStr.includes('}')) {
      jsonStr += '}'; // Close the object if it's incomplete
    }

    // Validate JSON structure
    const parsed = JSON.parse(jsonStr);
    
    // Ensure all required fields exist
    const requiredFields = [
      'Invoice number', 'Date', 'Total amount', 'Product names',
      'Unit Amount', 'Quantity', 'Price with tax', 'Tax amount',
      'Party name', 'Company name'
    ];

    requiredFields.forEach(field => {
      if (!parsed.hasOwnProperty(field)) {
        parsed[field] = field.includes('names') || field.includes('Amount') ? [] : '';
      }
    });

    return JSON.stringify(parsed);
  } catch (error) {
    console.error('Error sanitizing response:', error);
    // Return a valid default JSON structure
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
      'Company name': 'unknown'
    });
  }
};

const buildGeminiPrompt = () => ({
  text: `Extract information from the document and return it in this exact JSON format. Use "unknown" for missing text fields and "0" for missing numbers:
{
  "Invoice number": "string",
  "Date": "string",
  "Total amount": "string",
  "Product names": ["string"],
  "Unit Amount": ["string"],
  "Quantity": [0],
  "Price with tax": ["string"],
  "Tax amount": "string",
  "Party name": "string",
  "Company name": "string",
  "Mobile number/Phone number/MOBILE": "string"
}

Important:
1. Return ONLY the JSON object
2. Ensure all array fields are arrays even with single items
3. Use double quotes for strings
4. Do not include any explanatory text`
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