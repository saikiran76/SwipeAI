import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractedData } from '../utils/types';
import { jsonrepair } from 'jsonrepair'; 
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

const schema = {
    type: 'object',
    properties: {
        customers: { type: 'array', items: { type: 'object' } },
        products: { type: 'array', items: { type: 'object' } },
        invoices: { type: 'array', items: { type: 'object' } },
    },
    required: ['customers', 'products', 'invoices'],
};

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const prompt = `
You are tasked with extracting structured JSON data from CSV content representing invoice transactions. Please ensure that you accurately identify and categorize the following sections based on the provided data:

1. **Customers**: For each customer, extract and include:
   - Name (string)
   - Email (string, optional)
   - Phone (string, optional)
   - Address (string, optional)

   **Note**: Ensure that each customer name is derived from the invoice data provided. If a customer has no associated details, do not include them in the output.

2. **Products**: For each product associated with an invoice, extract and include:
   - Product ID (string)
   - Name (string)
   - Description (string, optional)
   - Unit Price (number)
   - Tax Percentage (number)
   - Price with Tax (number)

   **Important**: Only include products that are directly related to the invoices. Exclude any generic charges such as "Shipping Charges" or "Debit Card Charges" unless they are explicitly listed as products in the invoice details.

3. **Invoices**: For each invoice, extract and include:
   - Invoice ID (string)
   - Date (string in 'DD MMM YYYY' format)
   - Total Amount (number)
   - Customer ID (integer referencing the index of the customer in the Customers array)
   - Tax Amount (number, optional)
   - Products Purchased (array of product IDs)

**Important Notes**:
- Ensure all fields are present in the output JSON, even if some values are null.
- If a product or customer cannot be identified from the provided data, indicate this in a user-friendly manner.
- Follow this JSON schema strictly:

\`\`\`json
{
  "customers": [
    {
      "name": "string",
      "email": "string or null",
      "phone": "string or null",
      "address": "string or null"
    }
  ],
  "products": [
    {
      "product_id": "string",
      "name": "string",
      "description": "string or null",
      "unit_price": number,
      "tax_percentage": number,
      "price_with_tax": number
    }
  ],
  "invoices": [
    {
      "invoice_id": "string",
      "date": "DD MMM YYYY",
      "total_amount": number,
      "customer_id": integer,
      "tax_amount": number or null,
      "products_purchased": ["product_id"]
    }
  ]
}
\`\`\`

Please analyze the following CSV content and generate a structured JSON response according to this schema.
`;

export const extractInvoiceData = async (csvContent: string): Promise<ExtractedData> => {
    try {
        const model = await genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                maxOutputTokens: 2048,
            },
        });

        const parts = [
            {
                inlineData: {
                    data: btoa(csvContent), 
                    mimeType: 'text/csv',
                },
            },
            { text: prompt },
        ];

        const result = await model.generateContent(parts);
        let response = await result.response.text();

        console.log("Raw AI Response:", response);

        response = response.replace(/```json|```/g, '').trim();

        let parsedResponse: any;
        try {
            parsedResponse = JSON.parse(response);
        } catch (jsonError) {
            console.warn('Malformed JSON detected. Attempting repair...');
            try {
                const repairedResponse = jsonrepair(response);
                parsedResponse = JSON.parse(repairedResponse);
            } catch (repairError: any) {
                console.error('JSON Repair Failed:', repairError);
                throw new Error(`Malformed JSON from Gemini AI and repair failed: ${repairError.message}`);
            }
        }

        const validate = ajv.compile(schema);
        if (!validate(parsedResponse)) {
            console.error('Validation Errors:', validate.errors);
            throw new Error('Invalid JSON structure in AI response.');
        }

        return parsedResponse as ExtractedData;
    } catch (error) {
        console.error('Error in data extraction:', error);
        throw new Error('Failed to extract invoice data using Gemini AI.');
    }
};
