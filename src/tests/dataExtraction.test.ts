import { describe, it, expect } from 'vitest';
import { extractDataFromDocument } from '../services/geminiAIService';
import { mockFileData, mockExtractedData, readFileContent } from '../utils/tests/testUtils';
import { validateExtractedData } from '../services/geminiService';

describe('Data Extraction Integration Tests', () => {
  it('should successfully extract data from PDF file', async () => {
    const fileContent = await readFileContent(mockFileData.pdf.name);
    const result = await extractDataFromDocument(fileContent, 'application/pdf');
    expect(validateExtractedData(result)).toBeDefined();
  });

  it('should handle missing required fields', async () => {
    const invalidData = {
      ...mockExtractedData,
      invoices: [{
        id: '1',
        // Missing required fields
      }]
    };

    expect(() => validateExtractedData(invalidData)).toThrow('Missing required field');
  });

  it('should maintain data relationships', async () => {
    const fileContent = await readFileContent(mockFileData.pdf.name);
    const result = await extractDataFromDocument(fileContent, 'application/pdf');
    
    // Verify relationships
    const invoice = result.invoices[0];
    const customer = result.customers.find((c: { id: string }) => c.id === invoice.customerId);
    const product = result.products.find((p: { id: string }) => p.id === invoice.productId);
    
    expect(customer).toBeDefined();
    expect(product).toBeDefined();
  });
}); 