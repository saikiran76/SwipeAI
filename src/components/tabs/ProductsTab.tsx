import { useSelector, useDispatch } from 'react-redux';
import Table from '../common/Table';
import { RootState } from '../../utils/appStore';
import { Product } from '../../utils/types';

const ProductsTab = () => {
  const products = useSelector((state: RootState) => state.products.items) as Product[];
  const loading = useSelector((state: RootState) => state.products.loading);

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'quantity', label: 'Quantity', sortable: true },
    { key: 'unitPrice', label: 'Unit Price', sortable: true },
    { key: 'tax', label: 'Tax', sortable: true },
    { key: 'priceWithTax', label: 'Price with Tax', sortable: true },
    { key: 'discount', label: 'Discount', sortable: true },
  ];

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Products</h2>
      <Table columns={columns} data={products} />
    </div>
  );
};

export default ProductsTab; 