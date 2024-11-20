import { Invoice, Product, Customer } from '../utils/types';

interface ExtractedData {
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
}

// export const extractDataFromFile = async (file: File): Promise<ExtractedData> => {
//   try {
//     const formData = new FormData();
//     formData.append('file', file);

//     // Replace with your actual Gemini API endpoint
//     const response = await fetch('YOUR_GEMINI_API_ENDPOINT', {
//       method: 'POST',
//       body: formData,
//     });

//     if (!response.ok) {
//       throw new Error('Failed to process file');
//     }

//     const data = await response.json();
//     return validateExtractedData(data);
//   } catch (error) {
//     throw new Error(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
//   }
// };

export const validateExtractedData = (data: any): ExtractedData => {
  const requiredFields = {
    invoices: ['id', 'serialNumber', 'customerId', 'productId', 'quantity', 'tax', 'totalAmount', 'date'],
    products: ['id', 'name', 'quantity', 'unitPrice', 'tax', 'priceWithTax'],
    customers: ['id', 'name', 'phoneNumber', 'totalPurchaseAmount']
  };

  // Validate each section
  Object.entries(requiredFields).forEach(([section, fields]) => {
    if (!data[section] || !Array.isArray(data[section])) {
      throw new Error(`Invalid or missing ${section} data`);
    }

    data[section].forEach((item: any, index: number) => {
      fields.forEach(field => {
        if (!(field in item)) {
          throw new Error(`Missing required field '${field}' in ${section} at index ${index}`);
        }
      });
    });
  });

  return data as ExtractedData;
}; 