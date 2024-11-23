import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setInvoices } from '../utils/reducers/invoicesSlice';
import { setCustomers } from '../utils/reducers/customersSlice';
import { setProducts } from '../utils/reducers/productsSlice';
import { extractInvoiceData } from '../services/ExcelAIService';
import { transformExtractedData } from '../services/ExcelDataTransformer';
import { convertExcelToCSV } from '../helpers/excelToCsv';
import FileUploadZone from './FileUpload';
import TabLayout from './TabLayout';
import Tooltip from './ToolTip';

const MAX_RETRIES = 3;

const ExcelHandler = () => {
  const dispatch = useDispatch();
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false); // State to control loading indicator

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true); // Show loading indicator
      setProcessingStatus('Converting file to CSV...');
      const csvContent = await convertExcelToCSV(file);

      setProcessingStatus('Sending data to Gemini AI...');
      let rawData;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          rawData = await extractInvoiceData(csvContent); // Attempt extraction
          break; // Exit loop if successful
        } catch (error) {
          console.warn(`Retry Attempt ${attempt}:`, error);
          setProcessingStatus(`Retrying... Attempt ${attempt} of ${MAX_RETRIES}`);
          if (attempt === MAX_RETRIES) {
            throw new Error('Maximum retries reached. Failed to process the file.');
          }
        }
      }

      setProcessingStatus('Transforming AI response...');
      const processedData = transformExtractedData(rawData);

      dispatch(setCustomers(processedData.customers));
      dispatch(setProducts(processedData.products));
      dispatch(setInvoices(processedData.invoices));

      setProcessingStatus('File processed successfully.');
    } catch (error: any) {
      console.error('Processing failed:', error);
      setProcessingStatus(`Processing failed: ${error.message}`);
    } finally {
      setIsLoading(false); // Hide loading indicator after processing
    }
  };

  return (
    <div>
      <FileUploadZone
        onFileUpload={handleFileUpload}
        supportText="Supports Excel files"
        accept={['.xlsx', '.xls']}
      />
      
      {isLoading && <Tooltip message={processingStatus} />}

      <TabLayout />
    </div>
  );
};

export default ExcelHandler;