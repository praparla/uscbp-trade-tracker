import { Search, X, SlidersHorizontal, ChevronDown, MapPin } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { ACTION_TYPE_COLORS, ACTION_TYPE_LABELS } from '../constants'

function CountryDropdown({ countries, selected, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const filtered = search
    ? countries.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    : countries

  const toggle = (country) => {
    const next = selected.includes(country)
      ? selected.filter((c) => c !== country)
      : [...selected, country]
    onUpdate(next)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
          selected.length > 0
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : 'border-gray-200 text-gray-500 hover:border-gray-300'
        }`}
      >
        <MapPin className="w-3 h-3" />
        {selected.length > 0
          ? `${selected.length} countr${selected.length === 1 ? 'y' : 'ies'}`
          : 'Countries'}
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Search input */}
          <div className="p-1.5 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search countries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Country list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-2">No matches</p>
            ) : (
              filtered.map((country) => {
                const isActive = selected.includes(country)
                return (
                  <button
                    key={country}
                    onClick={() => toggle(country)}
                    className="w-full flex items-center gap-2 px-3 py-1 text-xs hover:bg-gray-50 transition-colors text-left"
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {isActive && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>
                    <span className={isActive ? 'text-gray-900 font-medium' : 'text-gray-600'}>
                      {country}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {selected.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-1.5 flex justify-between items-center">
              <span className="text-[10px] text-gray-400">
                {selected.length} selected
              </span>
              <button
                onClick={() => onUpdate([])}
                className="text-[10px] text-red-500 hover:text-red-700"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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
          {/* Country dropdown */}
          <CountryDropdown
            countries={filterOptions.countries}
            selected={filters.countries}
            onUpdate={(next) => updateFilter('countries', next)}
          />

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
