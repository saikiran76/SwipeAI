export interface ExtractedData {
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