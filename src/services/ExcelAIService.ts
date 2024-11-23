import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractedData } from '../utils/types';
import { jsonrepair } from 'jsonrepair'; // Import the repair library
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

const prompt = `Please extract structured JSON data from the provided CSV content. The output should include three main sections: 
    1. **Customers**: An array of customer objects, each containing fields such as name, email, phone number, and address.
    2. **Products**: An array of product objects, each containing fields such as product ID, name, description, and price.
    3. **Invoices**: An array of invoice objects, each containing fields such as invoice ID, date, total amount, customer ID, and a list of purchased products.

    Ensure that all fields are included in the output JSON structure even if some values are missing. The resulting JSON should adhere to the following schema:

    {
        "customers": [{ /* customer object */ }],
        "products": [{ /* product object */ }],
        "invoices": [{ /* invoice object */ }]
    }

    If any field is missing in the CSV data, represent it with a null or empty value instead of omitting it. Please provide the output in valid JSON format.`;

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
                    data: btoa(csvContent), // Base64 encode CSV content
                    mimeType: 'text/csv',
                },
            },
            { text: prompt },
        ];

        const result = await model.generateContent(parts);
        let response = await result.response.text();

        // Log raw response for debugging
        console.log("Raw AI Response:", response);

        // Step 1: Sanitize response
        response = response.replace(/```json|```/g, '').trim();

        // Step 2: Attempt to parse JSON
        let parsedResponse: any;
        try {
            parsedResponse = JSON.parse(response);
        } catch (jsonError) {
            console.warn('Malformed JSON detected. Attempting repair...');
            // Attempt to repair malformed JSON
            try {
                const repairedResponse = jsonrepair(response); // Repair JSON
                parsedResponse = JSON.parse(repairedResponse);
            } catch (repairError: any) {
                console.error('JSON Repair Failed:', repairError);
                throw new Error(`Malformed JSON from Gemini AI and repair failed: ${repairError.message}`);
            }
        }

        // Step 3: Validate against schema
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