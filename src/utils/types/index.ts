interface Customer {
    id: string;
    name: string;
    phoneNumber: string;
    totalPurchaseAmount: number;
    email?: string;
    address?: string;
}
  
interface Product {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    tax: number;
    priceWithTax: number;
    discount?: number;
}
  
interface Invoice {
    id: string;
    serialNumber: string;
    customerId: string;
    productId: string;
    quantity: number;
    tax: number;
    totalAmount: number;
    date: string;
}

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
  
export type { Customer, Product, Invoice, ExtractedData };