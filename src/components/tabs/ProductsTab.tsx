import { useSelector } from 'react-redux';
import Table from '../common/Table';
import { RootState } from '../../utils/appStore';
import { Product } from '../../utils/types';
// import { Column } from '../common/Table';

const formatCurrency = (amount: string | number): string => {
  if (!amount || Number(amount) === 0) {
    return '-';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(amount));
};

const ProductsTab = () => {
  const products = useSelector((state: RootState) => state.products.items) as Product[];
  const loading = useSelector((state: RootState) => state.products.loading);

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'quantity', label: 'Quantity', sortable: true },
    {
      key: 'unitPrice',
      label: 'Unit Price',
      sortable: true,
      render: (product: Product) => formatCurrency(product.unitPrice),
    },
    {
      key: 'discount',
      label: 'Discount',
      sortable: true,
      sortKey: 'discountRate',
      render: (product: Product) =>
        product.discountRate && product.discountAmount
          ? `${product.discountRate} (-${formatCurrency(product.discountAmount)})`
          : '-',
    },
    {
      key: 'tax',
      label: 'Tax',
      sortable: true,
      sortKey: 'taxRate',
      render: (product: Product) =>
        product.taxRate
          ? `${product.taxRate}`
          : '-',
    },
    {
      key: 'priceWithTax',
      label: 'Price with Tax',
      sortable: true,
      render: (product: Product) => formatCurrency(product.priceWithTax),
    },
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