import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setInvoices } from '../utils/reducers/invoicesSlice';
import { setProducts } from '../utils/reducers/productsSlice';
import { setCustomers } from '../utils/reducers/customersSlice';
import { processExcelFile } from '../services/excelProcessingService';
import FileUploadZone from './common/FileUploadZone';
import TabLayout from './TabLayout';

const ExcelHandler = () => {
  const dispatch = useDispatch();
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const SUPPORTED_FILE_TYPES = ['.xlsx', '.xls'];

  const handleFileUpload = async (file: File) => {
    try {
      setProcessingStatus('Processing Excel file...');
      const processedData = await processExcelFile(file);

      dispatch(setCustomers(processedData.customers));
      dispatch(setProducts(processedData.products));
      dispatch(setInvoices(processedData.invoices));

      setProcessingStatus('Excel file processed successfully.');
    } catch (error: any) {
      setProcessingStatus(`Processing failed: ${error.message}`);
    }
  };

  return (
    <div>
      <FileUploadZone
        onFileUpload={handleFileUpload}
        supportText="Supports Excel files"
        accept={SUPPORTED_FILE_TYPES}
      />
      {processingStatus && <p className="text-sm mt-4 text-gray-700">{processingStatus}</p>}
      <TabLayout />
    </div>
  );
};

export default ExcelHandler;
