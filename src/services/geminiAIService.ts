import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateExtractedData } from './geminiService';
// import { ExtractedData } from '../utils/types';
import { v4 as uuidv4 } from 'uuid';
import { Invoice, Product, Customer } from '../utils/types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const getModel = async () => {
    try {
        return await genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                maxOutputTokens: 2048,
            }
        });
    } catch (error) {
        console.error("Error creating Gemini model:", error);
        throw new Error("Failed to initialize Gemini model");
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
  - **Tax Rate and Amount Extraction:** Extract overall and individual tax rates and amounts accurately.
  - **Discount Extraction:** Ensure discounts are extracted correctly for each product.
  - **Email Field:** Default to “unknown” if not present.
  - **General Instructions:** Use double quotes for strings; ensure numeric values are strings; no additional commentary.
  - **Data Alignment:** Each element in arrays must correspond to the same product across all arrays.
`,
});

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
];

const processGeminiResponse = (response: string): ExtractedData => {
    try {
        const sanitizedResponse = sanitizeGeminiResponse(response);
        const rawData = JSON.parse(sanitizedResponse);

        // Validate and transform the data
        const validatedData = validateAndHandleMissingFields([rawData]);
        const transformedResponse = transformGeminiResponse(validatedData);

        if (!transformedResponse.invoices?.length) {
            throw new Error('No invoice data extracted');
        }

        return validateExtractedData(transformedResponse);
    } catch (error) {
        console.error('Data extraction error:', error);
        throw new Error('Failed to process Gemini response: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
};

const sanitizeGeminiResponse = (response: string): string => {
    return response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/[\r\n]+/g, ' ')
        .trim();
};

const validateAndHandleMissingFields = (data: any[]): any[] => {
    return data.map(item => {
        REQUIRED_FIELDS.forEach(field => {
            if (!item[field]) {
                item[field] = field === 'Email' ? 'unknown' : '0'; 
            }
        });
        return item;
    });
};

const transformGeminiResponse = (data: any): ExtractedData => {
  const invoices: Invoice[] = [];
  const products: Product[] = [];
  const customersMap = new Map<string, Customer>();

  // Extracting invoice data
  const invoiceItem = data[0]; // Assuming single invoice extraction
  const invoiceId = `INV-${invoiceItem['Invoice number']}`;

  // Create a customer object if not already created
  const customerName = invoiceItem['Party name'] || 'Unknown Customer';
  if (!customersMap.has(customerName)) {
      customersMap.set(customerName, {
          id: `CUST_${uuidv4()}`,
          name: customerName,
          phoneNumber: invoiceItem['Mobile number/Phone number/MOBILE'] || '0000000000',
          email: invoiceItem['Email'] || 'unknown',
          address: invoiceItem['Address'] || 'unknown',
          totalPurchaseAmount: 0, // Will be calculated later
      });
  }

  // Push invoice with customer name included
  invoices.push({
      id: invoiceId,
      serialNumber: invoiceItem['Invoice number'],
      customerId: customersMap.get(customerName)?.id || `CUST_${uuidv4()}`,
      productId: `PROD_${uuidv4()}`, // This will be updated later
      quantity: parseFloat(invoiceItem['Quantity'][0]) || 0,
      // tax: parseFloat(invoiceItem['Tax amount per product'][0]) || 0,
      taxRate: parseFloat(invoiceItem['Tax rate per product'][0]) || 0,
      taxAmount: parseFloat(invoiceItem['Tax amount per product'][0]) || 0,
      totalAmount: parseFloat(invoiceItem['Total amount'].replace(',', '').trim()) || 0,
      date: invoiceItem['Date'],
      customerName: customerName, // Ensure customer name is included here
  });

  // Extracting product data
  invoiceItem['Product names'].forEach((productName: string, index: number) => {
      const unitPrice = parseFloat(invoiceItem['Unit Amount'][index].replace(',', '').trim()) || 0;
      
      products.push({
          id: `PROD_${uuidv4()}`,
          name: productName || 'Unknown Product',
          unitPrice: unitPrice.toFixed(2),
          discountDisplay: formatDiscountString(invoiceItem['Discount rate per product'][index], invoiceItem['Discount amount per product'][index]),
          taxDisplay: formatTaxString(invoiceItem['Tax rate per product'][index], invoiceItem['Tax amount per product'][index]),
          discountRate: invoiceItem['Discount rate per product'][index],
          discountAmount: invoiceItem['Discount amount per product'][index],
          taxRate: invoiceItem['Tax rate per product'][index],
          taxAmount: invoiceItem['Tax amount per product'][index],
          priceWithTax: invoiceItem['Price with tax'][index],
          quantity: parseFloat(invoiceItem['Quantity'][index]) || 0,
      });
  });

  // Update total purchase amount for customers
  customersMap.forEach((customer) => {
      const totalPurchaseAmount = products.reduce((sum, p) => sum + parseFloat(p.priceWithTax.replace(',', '').trim()), 0);
      customer.totalPurchaseAmount += totalPurchaseAmount;
  });

  const customers = Array.from(customersMap.values());

  return { invoices, products, customers };
};

const formatDiscountString = (rate: string, amount: string): string => {
    return `${rate}% (-₹${amount})`;
};

const formatTaxString = (rate: string, amount: string): string => {
    return `${rate}% (₹${amount})`;
};

export const extractDataFromDocument = async (fileContent: string, fileType: string): Promise<ExtractedData> => {
   const model = await getModel();
    
   const parts = [
       {
           inlineData: {
               data: fileContent.split(',')[1],
               mimeType: fileType
           }
       },
       buildGeminiPrompt()
   ];

   try {
       const result = await model.generateContent(parts);
       const response = result.response.text();
       console.log('Raw Gemini response:', response);
       return processGeminiResponse(response);
       
   } catch (error) {
       console.error('Data extraction error:', error);
       return validateExtractedData({
           invoices: [],
           products: [],
           customers: []
       });
   }
};

interface ExtractedData {
    invoices: Invoice[];
    products: Product[];
    customers: Customer[];
}

