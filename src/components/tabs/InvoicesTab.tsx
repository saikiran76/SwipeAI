import { useSelector } from 'react-redux';
import Table from '../common/Table';
import { RootState } from '../../utils/appStore';

import { getEnrichedInvoices } from '../../utils/selectors';
import ErrorAlert from '../common/ErrorAlert';

const InvoicesTab = () => {
  const enrichedInvoices = useSelector(getEnrichedInvoices);
  const loading = useSelector((state: RootState) => state.invoices.loading);
  const error = useSelector((state: RootState) => state.invoices.error);

  console.log('InvoicesTab render:', { enrichedInvoices, loading, error });

  const columns = [
    { key: 'serialNumber', label: 'Serial Number', sortable: true },
    { key: 'customerName', label: 'Customer Name', sortable: true },
    { key: 'productName', label: 'Product Name', sortable: true },
    { key: 'quantity', label: 'Quantity', sortable: true },
    { key: 'tax', label: 'Tax', sortable: true },
    { key: 'totalAmount', label: 'Total Amount', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Invoices</h2>
      {error && <ErrorAlert message={error} onDismiss={() => {}} />}
      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : enrichedInvoices.length === 0 ? (
        <div className="text-center py-4">No invoices found</div>
      ) : (
        <Table columns={columns} data={enrichedInvoices} />
      )}
    </div>
  );
};

export default InvoicesTab; 