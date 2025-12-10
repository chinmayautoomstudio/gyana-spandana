'use client'

import { useState } from 'react'

interface FilterOption {
  value: string
  label: string
}

interface FilterBarProps {
  filters: {
    [key: string]: {
      label: string
      options: FilterOption[]
      value: string
      onChange: (value: string) => void
    }
  }
  onReset?: () => void
}

export function FilterBar({ filters, onReset }: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const activeFiltersCount = Object.values(filters).filter((f) => f.value !== '').length

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-700">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-1 text-xs bg-[#C0392B] text-white rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onReset && activeFiltersCount > 0 && (
            <button
              onClick={onReset}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-sm text-[#C0392B] hover:text-[#A93226]"
          >
            {isOpen ? 'Hide' : 'Show'} Filters
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(filters).map(([key, filter]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {filter.label}
              </label>
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-sm"
              >
                <option value="">All</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

