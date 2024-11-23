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
  text: `You are an financial expert, Data Analyst, Advanced Software Engineer and an AI expert that extracts key information from invoices. Your task is to accurately extract the following fields and return them in the exact JSON format provided from any input document like pdf, image of any format, and as a data analyst i.e. excel sheet of any format. Ensure that all array fields are aligned so that each index corresponds to the same product across all arrays. Do not include any extra text or explanations. If certain fields are missing, use "unknown" or "0" as appropriate.

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
    "Discount rate per product": ["string"],
    "Discount amount per product": ["string"],
    "Party name": "string",
    "Company name": "string",
    "Mobile number/Phone number/MOBILE": "string",
    "Email": "string",
    "Address": "string"
  }

  Guidelines:
  - **Tax Rate and Amount Extraction:** Extract overall and individual tax rates and amounts accurately. Tax rate will be in GST format. (ex: 8% GST, CGST, SGST, IGST, etc.)
  - **Discount Extraction:** Ensure discounts are extracted correctly for each product. Do not confuse between Tax rate and Discount rate. (Discount rate will be in percentage. Example: Disc(2%) or 2% OFF)
  - **Email Field:** Default to “unknown” if not present.
  - **General Instructions:** Use double quotes for strings; ensure numeric values are strings; no additional commentary.
  - **Data Alignment:** Each element in arrays must correspond to the same product across all arrays.
  - **Excel data extractiion:** Ensure that the data is extracted in the exact format as shown in the example. Fields might be in different format and in different order since its a sheet of excel but as a analyst, you need to extract the data in the exact format as shown in the example.
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
          email: invoiceItem['Email'] || '-',
          address: invoiceItem['Address'] || '-',
          totalPurchaseAmount: 0,
      });
  }

  // Push invoice with customer name included
  invoices.push({
      id: invoiceId,
      serialNumber: invoiceItem['Invoice number'],
      customerId: customersMap.get(customerName)?.id || `CUST_${uuidv4()}`,
      productId: `PROD_${uuidv4()}`,
      productName: Array.isArray(invoiceItem['Product names']) ? invoiceItem['Product names'][0] : '-',
      quantity: Array.isArray(invoiceItem['Quantity']) 
          ? invoiceItem['Quantity'].reduce((acc: number, curr: string) => acc + parseFloat(curr || '0'), 0) 
          : 0,
      taxRate: parseFloat(String(invoiceItem['Total Tax Rate'])) || 0,
      totalAmount: parseFloat(String(invoiceItem['Total amount']).replace(/[^\d.-]/g, '')) || 0,
      date: invoiceItem['Date'],
      customerName: customerName || '-',
  });

  console.log("_invoices: ", invoices)

  // Extracting product data
  if (Array.isArray(invoiceItem['Product names'])) {
      invoiceItem['Product names'].forEach((productName: string, index: number) => {
          const unitPrice = Array.isArray(invoiceItem['Unit Amount']) 
              ? parseFloat(String(invoiceItem['Unit Amount'][index]).replace(/[^\d.-]/g, '')) || 0 
              : 0;

          products.push({
              id: `PROD_${uuidv4()}`,
              name: productName || '-',
              unitPrice: unitPrice.toFixed(2),
              discountDisplay: formatDiscountString(
                  Array.isArray(invoiceItem['Discount rate per product']) ? invoiceItem['Discount rate per product'][index] : '0',
                  Array.isArray(invoiceItem['Discount amount per product']) ? invoiceItem['Discount amount per product'][index] : '0'
              ),
              taxDisplay: formatTaxString(String(invoiceItem['Total Tax Rate'])),
              discountRate: Array.isArray(invoiceItem['Discount rate per product']) ? invoiceItem['Discount rate per product'][index] : '0',
              discountAmount: Array.isArray(invoiceItem['Discount amount per product']) ? invoiceItem['Discount amount per product'][index] : '0',
              taxRate: String(invoiceItem['Total Tax Rate']),
              taxAmount: String(invoiceItem['Total Tax Amount']),
              priceWithTax: Array.isArray(invoiceItem['Price with tax']) ? invoiceItem['Price with tax'][index] : '0',
              quantity: Array.isArray(invoiceItem['Quantity']) ? parseFloat(invoiceItem['Quantity'][index] || '0') : 0,
          });
      });
  }

  // Update total purchase amount for customers
  customersMap.forEach((customer) => {
      const totalPurchaseAmount = products.reduce((sum, p) => sum + parseFloat(String(p.priceWithTax).replace(/[^\d.-]/g, '')), 0);
      customer.totalPurchaseAmount = totalPurchaseAmount;
  });

  return { 
      invoices, 
      products, 
      customers: Array.from(customersMap.values()) 
  };
};

const formatDiscountString = (rate: string, amount: string): string => {
    return `${rate}% (-₹${amount})`;
};

const formatTaxString = (rate: string): string => {
    return `${rate}%`;
};

// const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
//     const binary = String.fromCharCode(...new Uint8Array(buffer));
//     return btoa(binary);
// };
  

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

