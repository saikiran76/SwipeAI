import { useSelector } from 'react-redux';
import Table from '../common/Table';
import { RootState } from '../../utils/appStore';
import ErrorAlert from '../common/ErrorAlert';

const CustomersTab = () => {
  const customers = useSelector((state: RootState) => state.customers.items);
  const loading = useSelector((state: RootState) => state.customers.loading);
  const error = useSelector((state: RootState) => state.customers.error);

  const columns = [
    { key: 'name', label: 'Customer Name', sortable: true },
    { key: 'phoneNumber', label: 'Phone Number', sortable: true },
    { key: 'totalPurchaseAmount', label: 'Total Purchase Amount', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'address', label: 'Address', sortable: true },
  ];

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