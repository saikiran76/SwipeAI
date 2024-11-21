import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { v4 as uuidv4 } from 'uuid';

interface ExtractedData {
    invoices: {
      id: string;
      serialNumber: string;
      customerId: string;
      productId: string;
      quantity: number;
      tax: number;
      totalAmount: number;
      date: string;
    }[];
    products: {
      id: string;
      name: string;
      quantity: number;
      unitPrice: number;
      tax: number;
      priceWithTax: number;
    }[];
    customers: {
      id: string;
      name: string;
      phoneNumber: string;
      totalPurchaseAmount: number;
    }[];
}

export const processDocument = async (buffer: Buffer): Promise<ExtractedData> => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // First try direct PDF parsing
    const pdfData = await pdfParse(buffer);
    let extractedText = pdfData.text;

    // If text extraction yields poor results, try OCR
    if (!extractedText || extractedText.length < 50) {
      const images = await convertPDFToImages(page, buffer);
      const ocrResults = await Promise.all(
        images.map(async (image) => {
          const worker = await createWorker('eng');
          const { data: { text } } = await worker.recognize(image);
          await worker.terminate();
          return text;
        })
      );
      extractedText = ocrResults.join('\n');
    }

    return parseExtractedText(extractedText);
  } finally {
    await browser.close();
  }
};

const parseExtractedText = (text: string): ExtractedData => {
  const lines = text.split('\n').filter(line => line.trim());
  
  const invoice = {
    id: `INV_${uuidv4()}`,
    serialNumber: findInvoiceNumber(lines),
    customerId: `CUST_${uuidv4()}`,
    productId: `PROD_${uuidv4()}`,
    quantity: findTotalQuantity(lines),
    tax: findTaxAmount(lines),
    totalAmount: findTotalAmount(lines),
    date: findDate(lines)
  };

  const product = {
    id: invoice.productId,
    name: findProductName(lines),
    quantity: invoice.quantity,
    unitPrice: findUnitPrice(lines),
    tax: invoice.tax,
    priceWithTax: invoice.totalAmount
  };

  const customer = {
    id: invoice.customerId,
    name: findPartyName(lines),
    phoneNumber: findPhoneNumber(lines) || '0000000000',
    totalPurchaseAmount: invoice.totalAmount
  };

  return {
    invoices: [invoice],
    products: [product],
    customers: [customer]
  };
};

const convertPDFToImages = async (page: Page, pdfBuffer: Buffer): Promise<Buffer[]> => {
  const images: Buffer[] = [];
  await page.setContent(`
    <div id="pdfContainer"></div>
    <canvas id="pdfCanvas"></canvas>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js"></script>
  `);

  await page.evaluate((pdfData: string) => {
    return new Promise<void>((resolve) => {
      const pdfDataUri = `data:application/pdf;base64,${pdfData}`;
      // @ts-ignore - pdfjsLib is loaded from CDN
      window.pdfjsLib.getDocument(pdfDataUri).promise.then((pdf: PDFDocumentProxy) => {
        const canvas = document.getElementById('pdfCanvas') as HTMLCanvasElement;
        const context = canvas.getContext('2d')!;
        const promises: Promise<void>[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          promises.push(
            pdf.getPage(i).then((page: any) => {
              const viewport = page.getViewport({ scale: 2.0 });
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              return page.render({ canvasContext: context, viewport }).promise;
            })
          );
        }

        Promise.all(promises).then(() => resolve());
      });
    });
  }, pdfBuffer.toString('base64'));

  const canvas = await page.$('#pdfCanvas');
  if (canvas) {
    const screenshot = await canvas.screenshot() as Buffer;
    images.push(screenshot);
  }

  return images;
};

// Helper functions for parsing text
const findInvoiceNumber = (lines: string[]): string => {
  const invoiceLine = lines.find(line => line.toLowerCase().includes('invoice')) || '';
  return invoiceLine.match(/\d+/)?.[0] || 'unknown';
};

const findDate = (lines: string[]): string => {
  const dateLine = lines.find(line => /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(line)) || '';
  return dateLine.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/)?.[0] || 'unknown';
};

const findTotalAmount = (lines: string[]): number => {
  const totalLine = lines.find(line => line.toLowerCase().includes('total')) || '';
  const amount = totalLine.match(/[\d,]+\.?\d*/)?.[0] || '0';
  return parseFloat(amount.replace(/,/g, ''));
};

const findPartyName = (lines: string[]): string => {
  const partyLine = lines.find(line => line.toLowerCase().includes('bill to')) || '';
  return partyLine.replace(/bill to:?/i, '').trim() || 'unknown';
};

const findCompanyName = (lines: string[]): string => {
  // Usually the company name is at the top of the invoice
  return lines[0]?.trim() || 'unknown';
};

const findProducts = (lines: string[]): ExtractedData['products'] => {
  // Basic product extraction - enhance based on your document structure
  return [{
    id: `PROD_${uuidv4()}`,
    name: 'Sample Product',
    quantity: findTotalQuantity(lines),
    unitPrice: findUnitPrice(lines), // Changed from unitAmount
    tax: findTaxAmount(lines),       // Changed from taxAmount
    priceWithTax: findTotalAmount(lines)
  }];
};

const findCustomers = (lines: string[]): ExtractedData['customers'] => {
    // Basic customer extraction - enhance based on your document structure
    return [{
      id: `CUST_${uuidv4()}`,
      name: findPartyName(lines),
      phoneNumber: findPhoneNumber(lines) || '0000000000',
      totalPurchaseAmount: findTotalAmount(lines)  // Added required field
    }];
  };

const findTotalQuantity = (lines: string[]): number => {
  const qtyLine = lines.find(line => /quantity|qty/i.test(line)) || '';
  return parseInt(qtyLine.match(/\d+/)?.[0] || '0', 10);
};

const findTaxAmount = (lines: string[]): number => {
  const taxLine = lines.find(line => /tax/i.test(line)) || '';
  return parseFloat(taxLine.match(/[\d,]+\.?\d*/)?.[0] || '0');
};

const findUnitPrice = (lines: string[]): number => {
  const priceLine = lines.find(line => /unit\s*price|price\s*per/i.test(line)) || '';
  return parseFloat(priceLine.match(/[\d,]+\.?\d*/)?.[0] || '0');
};

const findProductName = (lines: string[]): string => {
  const productLine = lines.find(line => /item|product|description/i.test(line));
  return productLine?.replace(/item:|product:|description:/i, '').trim() || 'Unknown Product';
};

const findPhoneNumber = (lines: string[]): string => {
    const phoneLine = lines.find((line) => /phone|tel|mobile/i.test(line));
    const match = phoneLine?.match(/(?:\+91\s*|0)?\d{10}/); // Handle numbers with or without country code
    return match?.[0] || '0000000000';
};
   