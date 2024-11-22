export interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  totalPurchaseAmount: number;
}

export interface Product {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string;
  discountDisplay: string;
  taxDisplay: string;
  discountRate: string;
  discountAmount: string;
  taxRate: string;
  taxAmount: string;
  priceWithTax: string;
}

export interface Invoice {
  id: string;
  serialNumber: string;
  customerId: string;
  customerName: string;
  productId: string;
  quantity: number;
  // tax: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  date: string;
}

export interface ExtractedData {
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
}

  