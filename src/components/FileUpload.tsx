import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setLoading, setError, setInvoices } from '../utils/reducers/invoicesSlice';
import { setProducts } from '../utils/reducers/productsSlice';
import { setCustomers } from '../utils/reducers/customersSlice';
import { extractDataFromDocument } from '../services/geminiAIService';

const FileUpload = () => {
  const dispatch = useDispatch();
  const [dragActive, setDragActive] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const processFile = async (file: File) => {
    try {
      dispatch(setLoading(true));
      setProcessingStatus('Reading file...');

      const fileContent = await readFileContent(file);
      setProcessingStatus('Processing with AI...');

      const extractedData = await extractDataFromDocument(fileContent, file.type);
      
      dispatch(setInvoices(extractedData.invoices));
      dispatch(setProducts(extractedData.products));
      dispatch(setCustomers(extractedData.customers));
      
      setProcessingStatus('File processed successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      dispatch(setError(errorMessage));
      setProcessingStatus(`Error: ${errorMessage}`);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      
      if (file.type.includes('image')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className="border-2 border-dashed p-8 rounded-lg text-center"
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        onChange={(e) => e.target.files && processFile(e.target.files[0])}
        accept=".pdf,.xlsx,.xls,.jpg,.png"
        className="hidden"
        id="file-upload"
      />
      <label 
        htmlFor="file-upload"
        className="cursor-pointer text-blue-600 hover:text-blue-800"
      >
        Click to upload or drag and drop
      </label>
      <p className="text-sm text-gray-500 mt-2">
        Supports PDF, Excel, and Image files
      </p>
      {processingStatus && <p className="text-sm text-gray-500 mt-2">{processingStatus}</p>}
    </div>
  );
};

export default FileUpload;