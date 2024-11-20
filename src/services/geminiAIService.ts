import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateExtractedData } from './geminiService';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export const extractDataFromDocument = async (fileContent: string, fileType: string) => {
  try {
    const isImage = fileType.includes('image');
    const prompt = `Analyze this ${isImage ? 'invoice image' : 'document'} and extract the following information:
    1. Find all invoice details including serial number, date, amounts
    2. Identify customer information from the invoice
    3. Extract product details being sold
    4. Ensure IDs are consistent across all entities
    
    Format the response as a valid JSON object with this structure, using actual values from the ${isImage ? 'image' : 'document'}:
    {
      "invoices": [{
        "id": "INV_[number]",
        "serialNumber": "[actual serial from invoice]",
        "customerId": "CUST_[number]",
        "productId": "PROD_[number]",
        "quantity": [number],
        "tax": [number],
        "totalAmount": [number],
        "date": "[actual date from invoice]"
      }],
      "products": [{
        "id": "PROD_[number]",
        "name": "[actual product name]",
        "quantity": [number],
        "unitPrice": [number],
        "tax": [number],
        "priceWithTax": [number]
      }],
      "customers": [{
        "id": "CUST_[number]",
        "name": "[actual customer name]",
        "phoneNumber": "[actual phone]",
        "totalPurchaseAmount": [number]
      }]
    }`;

    let result;
    if (isImage) {
      const imageData = fileContent.split('base64,')[1];
      result = await model.generateContent([{
        inlineData: {
          data: imageData,
          mimeType: fileType
        }
      }, { text: prompt }]);
    } else {
      result = await model.generateContent([{ text: prompt }, { text: fileContent }]);
    }

    const response = result.response.text();
    const cleanedResponse = response.replace(/```json|```/g, '').trim();
    
    try {
      const parsedData = JSON.parse(cleanedResponse);
      const validatedData = validateExtractedData(parsedData);
      
      // Additional validation for relationships
      if (!validateRelationships(validatedData)) {
        throw new Error('Invalid data relationships detected');
      }
      
      return validatedData;
    } catch (parseError) {
      console.error('Parse error:', parseError);
      throw new Error('Failed to extract valid data from document');
    }
  } catch (error) {
    console.error('AI processing error:', error);
    throw new Error(`Data extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const validateRelationships = (data: any) => {
  const customerIds = new Set(data.customers.map((c: any) => c.id));
  const productIds = new Set(data.products.map((p: any) => p.id));
  
  return data.invoices.every((invoice: any) => 
    customerIds.has(invoice.customerId) && productIds.has(invoice.productId)
  );
}; 