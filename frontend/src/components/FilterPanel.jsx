import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { ACTION_TYPE_COLORS, ACTION_TYPE_LABELS } from '../constants'

export default function FilterPanel({
  filters,
  filterOptions,
  updateFilter,
  clearFilters,
  hasActiveFilters,
}) {
  const [expanded, setExpanded] = useState(false)

  const activeCount = [
    filters.searchText ? 1 : 0,
    filters.countries.length > 0 ? 1 : 0,
    filters.actionTypes.length > 0 ? 1 : 0,
    filters.status.length > 0 ? 1 : 0,
    filters.dateStart || filters.dateEnd ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Collapsed bar */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="font-medium">Filters</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold">
              {activeCount}
            </span>
          )}
          <ChevronDown
            className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Inline search — always visible */}
        <div className="relative flex-1 max-w-xs ml-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search actions..."
            value={filters.searchText}
            onChange={(e) => updateFilter('searchText', e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Active filter pills — always visible */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {filters.countries.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium shrink-0">
              {filters.countries.length} countr{filters.countries.length === 1 ? 'y' : 'ies'}
              <button
                onClick={() => updateFilter('countries', [])}
                className="hover:text-blue-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          {filters.actionTypes.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-medium shrink-0">
              {filters.actionTypes.length} type{filters.actionTypes.length === 1 ? '' : 's'}
              <button
                onClick={() => updateFilter('actionTypes', [])}
                className="hover:text-purple-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          {filters.status.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-medium shrink-0">
              {filters.status.length} status
              <button
                onClick={() => updateFilter('status', [])}
                className="hover:text-green-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          {(filters.dateStart || filters.dateEnd) && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium shrink-0">
              date range
              <button
                onClick={() => {
                  updateFilter('dateStart', '')
                  updateFilter('dateEnd', '')
                }}
                className="hover:text-amber-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-[10px] text-gray-400 hover:text-red-500 transition-colors shrink-0"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expanded filter controls */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 flex flex-wrap gap-2 items-start">
          {/* Country select */}
          <select
            multiple
            value={filters.countries}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => o.value)
              updateFilter('countries', selected)
            }}
            className="py-1 px-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 h-[28px] min-w-[150px]"
            title="Hold Ctrl/Cmd to multi-select countries"
          >
            <option value="" disabled>
              Country...
            </option>
            {filterOptions.countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Action type pills */}
          <div className="flex flex-wrap items-center gap-1">
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
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                    isActive
                      ? 'border-transparent text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                  style={isActive ? { backgroundColor: color } : {}}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {ACTION_TYPE_LABELS[type] || type}
                </button>
              )
            })}
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1">
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
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                    isActive
                      ? 'border-transparent text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                  style={isActive ? { backgroundColor: color } : {}}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              )
            })}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={filters.dateStart}
              onChange={(e) => updateFilter('dateStart', e.target.value)}
              className="px-1.5 py-0.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-gray-300 text-[10px]">to</span>
            <input
              type="date"
              value={filters.dateEnd}
              onChange={(e) => updateFilter('dateEnd', e.target.value)}
              className="px-1.5 py-0.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}
