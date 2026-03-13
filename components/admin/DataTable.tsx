'use client'

import { useState } from 'react'

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  searchable?: boolean
  searchPlaceholder?: string
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  getRowId?: (item: T) => string
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  searchable = false,
  searchPlaceholder = 'Search...',
  selectable = false,
  selectedIds,
  onSelectionChange,
  getRowId,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<keyof T | string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return

    if (sortColumn === column.key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column.key)
      setSortDirection('asc')
    }
  }

  const filteredData = data.filter((item) => {
    if (!searchTerm) return true
    return columns.some((col) => {
      const value = item[col.key]
      return value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    })
  })

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0

    const aValue = a[sortColumn]
    const bValue = b[sortColumn]

    if (aValue === bValue) return 0

    const comparison = aValue < bValue ? -1 : 1
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const effectiveSelectedIds = selectedIds ?? new Set<string>()

  const getIdForRow = (item: T): string => {
    if (getRowId) {
      return getRowId(item)
    }
    const idValue = item.id
    return typeof idValue === 'string' ? idValue : String(idValue)
  }

  const toggleRowSelection = (rowId: string) => {
    if (!onSelectionChange) return
    const next = new Set(effectiveSelectedIds)
    if (next.has(rowId)) {
      next.delete(rowId)
    } else {
      next.add(rowId)
    }
    onSelectionChange(next)
  }

  const toggleAllVisible = () => {
    if (!onSelectionChange) return
    const visibleIds = sortedData.map((item) => getIdForRow(item))
    const allSelected = visibleIds.every((id) => effectiveSelectedIds.has(id))
    const next = new Set(effectiveSelectedIds)
    if (allSelected) {
      visibleIds.forEach((id) => next.delete(id))
    } else {
      visibleIds.forEach((id) => next.add(id))
    }
    onSelectionChange(next)
  }

  const allVisibleSelected =
    selectable && sortedData.length > 0
      ? sortedData.every((item) => effectiveSelectedIds.has(getIdForRow(item)))
      : false
  const someVisibleSelected =
    selectable && sortedData.length > 0
      ? sortedData.some((item) => effectiveSelectedIds.has(getIdForRow(item)))
      : false

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent"
          />
          <svg
            className="absolute right-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      )}

      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg overflow-hidden max-w-full">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full min-w-max">
            <thead className="bg-gray-50">
              <tr>
                {selectable && (
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all rows"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) {
                          // visually indicate partial selection
                          el.indeterminate = someVisibleSelected && !allVisibleSelected
                        }
                      }}
                      onChange={toggleAllVisible}
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    onClick={() => handleSort(column)}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {column.header}
                      {column.sortable && sortColumn === column.key && (
                        <svg
                          className={`w-4 h-4 ${sortDirection === 'asc' ? '' : 'transform rotate-180'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              ) : (
                sortedData.map((item, index) => (
                  <tr
                    key={index}
                    onClick={() => onRowClick?.(item)}
                    className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                  >
                    {selectable && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label="Select row"
                          checked={effectiveSelectedIds.has(getIdForRow(item))}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleRowSelection(getIdForRow(item))}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {column.render ? column.render(item) : String(item[column.key] || '')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

