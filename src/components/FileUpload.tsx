// FileUpload.tsx

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setLoading, setError, setInvoices } from '../utils/reducers/invoicesSlice';
import { setProducts } from '../utils/reducers/productsSlice';
import { setCustomers } from '../utils/reducers/customersSlice';
import { extractDataFromDocument } from '../services/geminiAIService';
import { readFileContent } from '../utils/fileReader';
import { processFile } from '../services/ocrService'; // Updated import
import MethodSelector from './MethodSelector';
import { ExtractedData } from '../utils/types';

const SUPPORTED_FILE_TYPES = ['.pdf', '.xlsx', '.xls', '.jpg', '.png', '.webp'];

const FileUpload = () => {
  const dispatch = useDispatch();
  const [dragActive, setDragActive] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  // Function to handle success and update Redux state
  const handleSuccess = (data: ExtractedData) => {
    try {
      // Dispatch customers and products
      dispatch(setCustomers(data.customers));
      dispatch(setProducts(data.products));

      // Small delay to ensure customers and products are in store
      setTimeout(() => {
        dispatch(setInvoices(data.invoices));
      }, 0);

      setProcessingStatus('');
      setShowMethodSelector(false);
    } catch (error) {
      console.error('Error handling success:', error);
      dispatch(setError('Failed to process data'));
    }
  };

  // Function to handle errors
  const handleError = (error: any) => {
    dispatch(setError(error.message || 'An error occurred during processing'));
    setProcessingStatus('Processing failed');
    setProgress(0);
  };

  // Main file processing function
  const handleFileUpload = async (file: File, selectedModel?: 'gemini' | 'ocr') => {
    try {
      // Validate file type
      if (!SUPPORTED_FILE_TYPES.some((type) => file.name.toLowerCase().endsWith(type))) {
        setProcessingStatus('Unsupported file type. Please upload a PDF, Excel, or image file.');
        return;
      }

      setProgress(25);
      dispatch(setLoading(true));

      // Determine file type
      const isExcel = file.type.includes('excel') || 
                      file.type.includes('spreadsheet') || 
                      file.name.match(/\.(xlsx|xls|csv)$/i);

      if (isExcel) {
        setProcessingStatus('Processing Excel file...');
        const fileContent = await readFileContent(file);
        const extractedData = await extractDataFromDocument(fileContent, file.type);
        if(!extractedData){
          console.log("No data extracted from excel file");
          return;
        }
        handleSuccess(extractedData);
        return;
      }

      // Show method selector if no model is provided
      if (!selectedModel) {
        setCurrentFile(file);
        setShowMethodSelector(true);
        return;
      }

      setProcessingStatus(`Processing with ${selectedModel.toUpperCase()}...`);

      let extractedData;
      try {
        if (selectedModel === 'gemini') {
          const fileContent = await readFileContent(file);
          extractedData = await extractDataFromDocument(fileContent, file.type);
        } else {
          extractedData = await processFile(file); // Updated function
        }
      } catch (error) {
        if (selectedModel === 'gemini') {
          // Retry with OCR if Gemini fails
          setShowMethodSelector(true);
          return;
        }
        throw error;
      }
      if (!extractedData) {
        throw new Error('No data extracted from file');
      }

      handleSuccess(extractedData);
    } catch (error) {
      handleError(error);
    } finally {
      dispatch(setLoading(false));
      setProgress(0);
    }
  };

  // Drag-and-drop file handling
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
        className={`border-2 border-dashed p-8 rounded-lg text-center font-sans ${dragActive ? 'border-blue-600' : 'border-gray-300'}`}
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
        <p className="text-sm text-gray-500 mt-2">Supports PDF, Excel, and Image files</p>
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

      <MethodSelector
        onSelect={(method) => {
          setShowMethodSelector(false);
          if (currentFile) {
            handleFileUpload(currentFile, method);
          }
        }}
        isVisible={showMethodSelector}
      />
    </div>
  );
};

export default FileUpload;
