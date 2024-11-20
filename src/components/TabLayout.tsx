import { useState } from 'react';
import InvoicesTab from './tabs/InvoicesTab';
import ProductsTab from './tabs/ProductsTab';
import CustomersTab from './tabs/CustomersTab';
import FileUpload from './FileUpload';

const TabLayout = () => {
  const [activeTab, setActiveTab] = useState('invoices');

  const tabs = [
    { id: 'invoices', label: 'Invoices' },
    { id: 'products', label: 'Products' },
    { id: 'customers', label: 'Customers' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'invoices':
        return <InvoicesTab />;
      case 'products':
        return <ProductsTab />;
      case 'customers':
        return <CustomersTab />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <FileUpload />
      <div className="mt-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-4">{renderTabContent()}</div>
      </div>
    </div>
  );
};

export default TabLayout; 