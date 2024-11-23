import { useSelector } from 'react-redux';
import Table from '../common/Table';
import { RootState } from '../../utils/appStore';
import ErrorAlert from '../common/ErrorAlert';
import { Column } from '../common/Table';
import { formatCurrency } from '../../helpers/helper';

interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  totalPurchaseAmount: number;
}

const CustomersTab = () => {
  const customers = useSelector((state: RootState) => state.customers.items) as Customer[];
  const loading = useSelector((state: RootState) => state.customers.loading);
  const error = useSelector((state: RootState) => state.customers.error);

  const columns: Column[] = [
    { key: 'name', label: 'Customer Name', sortable: true },
    { key: 'phoneNumber', label: 'Phone Number', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'address', label: 'Address', sortable: true },
    {
      key: 'totalPurchaseAmount',
      label: 'Total Purchase Amount',
      sortable: true,
      render: (customer: Customer) => (
        <span onClick={() => handleClick(customer.totalPurchaseAmount)}>
          {formatCurrency(customer.totalPurchaseAmount)}
        </span>
      ),
    },
  ];

  const handleClick = (value: number) => {
    if (Number.isNaN(value)) {
      alert('Total Purchase Amount is not available for this customer.');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Customers</h2>
      {error && <ErrorAlert message={error} onDismiss={() => {}} />}
      <Table 
        columns={columns} 
        data={customers} 
        onRowClick={(customer) => {
          console.log('Selected customer:', customer);
        }}
      />
    </div>
  );
};

export default CustomersTab; 