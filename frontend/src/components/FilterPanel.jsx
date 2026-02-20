import { Search, X, SlidersHorizontal } from 'lucide-react'
import { ACTION_TYPE_COLORS, ACTION_TYPE_LABELS } from '../constants'

export default function FilterPanel({
  filters,
  filterOptions,
  updateFilter,
  clearFilters,
  hasActiveFilters,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filters</span>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Text search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search actions..."
            value={filters.searchText}
            onChange={(e) => updateFilter('searchText', e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Country multi-select */}
        <div className="min-w-[180px]">
          <select
            multiple
            value={filters.countries}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => o.value)
              updateFilter('countries', selected)
            }}
            className="w-full py-1.5 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-[34px]"
            title="Hold Ctrl/Cmd to multi-select countries"
          >
            <option value="" disabled>
              Filter by country...
            </option>
            {filterOptions.countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Action type checkboxes */}
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.actionTypes.map((type) => {
            const isActive = filters.actionTypes.includes(type)
            const color = ACTION_TYPE_COLORS[type] || ACTION_TYPE_COLORS.other
            return (
              <button
                key={type}
                onClick={() => {
                  const next = isActive
                    ? filters.actionTypes.filter((t) => t !== type)
                    : [...filters.actionTypes, type]
                  updateFilter('actionTypes', next)
                }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                  isActive
                    ? 'border-transparent text-white'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
                style={isActive ? { backgroundColor: color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {ACTION_TYPE_LABELS[type] || type}
              </button>
            )
          })}
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          {filterOptions.statuses.map((status) => {
            const isActive = filters.status.includes(status)
            const statusColors = {
              active: '#22c55e',
              expired: '#ef4444',
              pending: '#f59e0b',
              superseded: '#6b7280',
            }
            const color = statusColors[status] || '#94a3b8'
            return (
              <button
                key={status}
                onClick={() => {
                  const next = isActive
                    ? filters.status.filter((s) => s !== status)
                    : [...filters.status, status]
                  updateFilter('status', next)
                }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                  isActive
                    ? 'border-transparent text-white'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
                style={isActive ? { backgroundColor: color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            )
          })}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={filters.dateStart}
            onChange={(e) => updateFilter('dateStart', e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Start date"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            value={filters.dateEnd}
            onChange={(e) => updateFilter('dateEnd', e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="End date"
          />
        </div>
      </div>
    </div>
  )
}
