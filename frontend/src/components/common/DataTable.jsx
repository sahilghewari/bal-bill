import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import Skeleton from './Skeleton'
import EmptyState from './EmptyState'

const DataTable = ({
  columns,
  data = [],
  loading = false,
  onSort,
  sortBy,
  sortOrder,
  emptyMessage = 'No data found',
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4">
          <Skeleton height="h-12" count={5} />
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <EmptyState title={emptyMessage} />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-sm font-semibold text-gray-900"
                  onClick={() => onSort && column.sortable && onSort(column.key)}
                  style={{
                    cursor: column.sortable ? 'pointer' : 'default',
                    width: column.width,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && sortBy === column.key && (
                      sortOrder === 'asc' ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
              >
                {columns.map((column) => (
                  <td
                    key={`${row.id ?? idx}-${column.key}`}
                    className="px-6 py-4 text-sm text-gray-900"
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
