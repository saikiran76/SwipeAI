import React, { useState, useMemo } from 'react';

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  sortKey?: string;
  render?: (row: any) => React.ReactNode;
}

interface TableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
}

const Table = ({ columns, data, onRowClick }: TableProps) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const sortedData = useMemo(() => {
    let sortableData = [...data];

    if (searchTerm) {
      sortableData = sortableData.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (sortConfig) {
      sortableData.sort((a, b) => {
        const { key, direction } = sortConfig;
        const sortKey = columns.find((col) => col.key === key)?.sortKey || key;
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        // Remove currency symbols and commas
        const aNumber = parseFloat(String(aValue).replace(/[^0-9.-]+/g, ''));
        const bNumber = parseFloat(String(bValue).replace(/[^0-9.-]+/g, ''));

        if (!isNaN(aNumber) && !isNaN(bNumber)) {
          return direction === 'asc' ? aNumber - bNumber : bNumber - aNumber;
        } else {
          return direction === 'asc'
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
        }
      });
    }

    return sortableData;
  }, [data, sortConfig, searchTerm, columns]);

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          className="px-4 py-2 border rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  {column.label}
                  {sortConfig?.key === column.key && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row, index) => (
              <tr
                key={index}
                onClick={() => onRowClick?.(row)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;