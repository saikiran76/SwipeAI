// ocrService.ts

import { ExtractedData } from '../utils/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const processFile = async (file: File): Promise<ExtractedData> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/process-file`, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to process file');
    }

    const data = await response.json();

    // Validate and return the extracted data
    return data as ExtractedData;
  } catch (error) {
    console.error('Error processing file:', error);
    throw new Error(
      'Failed to process file: ' + (error instanceof Error ? error.message : 'Unknown error')
    );
  }
};
