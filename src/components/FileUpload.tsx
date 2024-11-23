import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setLoading, setError, setInvoices } from '../utils/reducers/invoicesSlice';
import { setProducts } from '../utils/reducers/productsSlice';
import { setCustomers } from '../utils/reducers/customersSlice';
import { extractDataFromDocument } from '../services/geminiAIService';
import { processExcelFile } from '../services/excelProcessingService';
import { readFileContent } from '../utils/fileReader';

const SUPPORTED_FILE_TYPES = ['.pdf', '.jpg', '.png', '.webp', '.xlsx', '.xls'];

const FileUpload = () => {
  const dispatch = useDispatch();
  const [dragActive, setDragActive] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  const handleFileUpload = async (file: File) => {
    try {
      const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

      if (isExcel) {
        setProcessingStatus('Processing Excel file...');
        const processedData = await processExcelFile(file);

        dispatch(setCustomers(processedData.customers));
        dispatch(setProducts(processedData.products));
        dispatch(setInvoices(processedData.invoices));

        setProcessingStatus('Excel file processed successfully.');
        return;
      }

      const isPdfOrImage = SUPPORTED_FILE_TYPES.some((type) => file.name.toLowerCase().endsWith(type) && !isExcel);
      if (isPdfOrImage) {
        setProcessingStatus('Processing PDF or Image file...');
        const fileContent = await readFileContent(file);
        const extractedData = await extractDataFromDocument(fileContent, file.type);

        dispatch(setCustomers(extractedData.customers));
        dispatch(setProducts(extractedData.products));
        dispatch(setInvoices(extractedData.invoices));

        setProcessingStatus('File processed successfully.');
        return;
      }

      throw new Error('Unsupported file type. Please upload a PDF, Image, or Excel file.');
    } catch (error: any) {
      dispatch(setError(error.message || 'An error occurred during file processing.'));
      setProcessingStatus('Processing failed.');
    } finally {
      setProgress(0);
      dispatch(setLoading(false));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="relative">
      <div
        className={`border-2 border-dashed p-8 rounded-lg text-center font-sans ${
          dragActive ? 'border-blue-600' : 'border-gray-300'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
          accept={SUPPORTED_FILE_TYPES.join(',')}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer text-blue-600 hover:text-blue-800"
        >
          Click to upload or drag and drop
        </label>
        <p className="text-sm text-gray-500 mt-2">Supports PDF, Image, and Excel files</p>
        {dragActive && <p className="text-blue-600">Drop the file here...</p>}
        {processingStatus && <p className="text-sm text-gray-500 mt-2">{processingStatus}</p>}
        {progress > 0 && (
          <div className="w-full bg-gray-200 rounded-full mt-4">
            <div
              className="bg-blue-600 text-xs font-medium text-white text-center p-0.5 leading-none rounded-full"
              style={{ width: `${progress}%` }}
            >
              {progress}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;




