import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setInvoices } from '../utils/reducers/invoicesSlice';
import { setProducts } from '../utils/reducers/productsSlice';
import { setCustomers } from '../utils/reducers/customersSlice';
import { setLoading } from '../utils/reducers/invoicesSlice';
import { setError } from '../utils/reducers/invoicesSlice';
import { extractDataFromDocument } from '../services/geminiAIService';
import { readFileContent } from '../utils/fileReader';
import FileUploadZone from './common/FileUploadZone';
import TabLayout from './TabLayout';
import MethodSelector from './MethodSelector';

const PdfImageHandler = () => {
  const dispatch = useDispatch();
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const SUPPORTED_FILE_TYPES = ['.pdf', '.jpg', '.png', '.webp'];

  const handleFileUpload = async (file: File, method?: 'gemini' | 'ocr') => {
    try {
      setProcessingStatus(`Processing file with ${method || 'Gemini AI'}...`);
      dispatch(setLoading(true));

      let extractedData;
      if (method === 'ocr') {
        // OCR handling logic (placeholder)
        extractedData = {}; // Replace with actual OCR processing logic
      } else {
        const fileContent = await readFileContent(file);;
        extractedData = await extractDataFromDocument(fileContent.toString(), file.type);
      }

      if (!extractedData) {
        throw new Error('No data extracted from file.');
      }

      dispatch(setCustomers(extractedData.customers || []));
      dispatch(setProducts(extractedData.products || []));
      dispatch(setInvoices(extractedData.invoices || []));

      setProcessingStatus('File processed successfully.');
    } catch (error: any) {
      dispatch(setError(error.message || 'An error occurred during processing.'));
      setProcessingStatus('Processing failed.');
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div>
      <FileUploadZone
        onFileUpload={(file) => {
          setCurrentFile(file);
          setShowMethodSelector(true);
        }}
        supportText="Supports PDF and Image files"
        accept={SUPPORTED_FILE_TYPES}
      />
      {processingStatus && <p className="text-sm mt-4 text-gray-700">{processingStatus}</p>}
      <MethodSelector
        isVisible={showMethodSelector}
        onSelect={(method) => {
          setShowMethodSelector(false);
          if (currentFile) {
            handleFileUpload(currentFile, method);
          }
        }}
      />
      <TabLayout />
    </div>
  );
};

export default PdfImageHandler;
                                         