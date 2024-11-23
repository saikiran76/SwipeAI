import React, { useState } from 'react';
import InvoicesTab from './tabs/InvoicesTab';
import ProductsTab from './tabs/ProductsTab';
import CustomersTab from './tabs/CustomersTab';

const TabLayout = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'products' | 'customers'>('invoices');

  const renderContent = () => {
    switch (activeTab) {
      case 'products':
        return <ProductsTab />;
      case 'customers':
        return <CustomersTab />;
      default:
        return <InvoicesTab />;
    }
  };

  return (
    <div>
      <nav className="flex justify-center gap-6 border-b-2 border-gray-200 mb-4 mt-6">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 ${
            activeTab === 'invoices' ? 'border-b-4 border-blue-500 text-blue-600' : 'text-gray-500'
          }`}
        >
          Invoices
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 ${
            activeTab === 'products' ? 'border-b-4 border-blue-500 text-blue-600' : 'text-gray-500'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 ${
            activeTab === 'customers' ? 'border-b-4 border-blue-500 text-blue-600' : 'text-gray-500'
          }`}
        >
          Customers
        </button>
      </nav>
      <div>{renderContent()}</div>
    </div>
  );
};

export default TabLayout;
