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
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleFileUpload = async (file: File) => {
        try {
            setIsLoading(true);
            setStatusMessage('Converting file to CSV...');
            const csvContent = await convertExcelToCSV(file);

            let rawData;
            setStatusMessage('Processing with AI...');
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    rawData = await extractInvoiceData(csvContent);
                    break;
                } catch (error) {
                    console.warn(`Retry ${attempt}/${MAX_RETRIES} failed.`, error);
                    if (attempt === MAX_RETRIES) throw new Error('AI service failed after retries.');
                }
            }

            setStatusMessage('Transforming AI data...');
            const transformedData = transformExtractedData(rawData);

            dispatch(setCustomers(transformedData.customers));
            dispatch(setProducts(transformedData.products));
            dispatch(setInvoices(transformedData.invoices));

            setStatusMessage('File processed successfully.');
        } catch (error: any) {
            console.error('Error processing file:', error);
            setStatusMessage(`Processing failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <FileUploadZone
                onFileUpload={handleFileUpload}
                supportText="Upload Excel files only"
                accept={['.xlsx', '.xls']}
            />
            {isLoading && <Tooltip message={statusMessage} />}
            <TabLayout />
        </div>
    );
};

export default ExcelHandler;
