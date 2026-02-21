import { useState, useEffect, useCallback } from 'react'
import { Shield, Info } from 'lucide-react'
import { useTradeData } from './hooks/useTradeData'
import { useRefresh } from './hooks/useRefresh'
import MvpBanner from './components/MvpBanner'
import ViewToggle from './components/ViewToggle'
import RefreshButton from './components/RefreshButton'
import FilterPanel from './components/FilterPanel'
import DashboardView from './components/DashboardView'
import TableView from './components/TableView'
import MapView from './components/MapView'
import IndustryView from './components/IndustryView'
import ActionDetailModal from './components/ActionDetailModal'
import { format, parseISO } from 'date-fns'

function App() {
  // Hash-based view routing
  const [view, setView] = useState(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash === 'table') return 'table'
    if (hash === 'map') return 'map'
    if (hash === 'industries') return 'industries'
    return 'dashboard'
  })

  const [selectedAction, setSelectedAction] = useState(null)
  const [showAbout, setShowAbout] = useState(false)

  // Listen for hash changes
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash === 'table') setView('table')
      else if (hash === 'map') setView('map')
      else if (hash === 'industries') setView('industries')
      else setView('dashboard')
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const handleViewChange = useCallback((newView) => {
    window.location.hash = newView
    setView(newView)
  }, [])

  const {
    meta,
    allActions,
    filteredActions,
    sortedActions,
    filters,
    filterOptions,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    sortField,
    sortDirection,
    handleSort,
    stats,
  } = useTradeData()

  const { isDevMode, isRefreshing, triggerRefresh } = useRefresh()

  const formatTimestamp = (ts) => {
    if (!ts) return 'Unknown'
    try {
      return format(parseISO(ts), "MMM d, yyyy 'at' h:mm a")
    } catch {
      return ts
    }
  }

  // Empty state
  if (allActions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-700 mb-2">
            No Trade Actions Found
          </h1>
          <p className="text-gray-500 text-sm mb-4">
            Run the scraper to populate the data:
          </p>
          <code className="block bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">
            cd scraper && python main.py
          </code>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* MVP Banner */}
      <MvpBanner meta={meta} />

      {/* Header */}
      <header className="bg-navy-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-blue-400" />
                <h1 className="text-lg font-semibold">
                  U.S. Trade Actions Timeline
                </h1>
              </div>
              <p className="text-sm text-gray-400 mt-0.5 ml-9">
                Last updated: {formatTimestamp(meta.generated_at)}
                {meta.errors?.length > 0 && (
                  <span className="text-amber-400 ml-2">
                    ({meta.errors.length} document{meta.errors.length !== 1 ? 's' : ''} had errors)
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAbout((s) => !s)}
                className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                title="About this data"
              >
                <Info className="w-4 h-4" />
              </button>
              <ViewToggle view={view} onViewChange={handleViewChange} />
              <RefreshButton
                isDevMode={isDevMode}
                isRefreshing={isRefreshing}
                onRefresh={triggerRefresh}
              />
            </div>
          </div>
        </div>
      </header>

      {/* About panel */}
      {showAbout && meta.cost_optimization && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-900">About this data</h3>
                <div className="text-xs text-blue-700 mt-1 space-y-0.5">
                  <p>
                    Model: <span className="font-mono">{meta.cost_optimization.model_used}</span>
                    {' | '}
                    API calls: {meta.cost_optimization.new_api_calls}
                    {' | '}
                    Cache hits: {meta.cost_optimization.cache_hits}
                    {meta.cost_optimization.estimated_cost_usd != null && (
                      <>{' | '}Est. cost: ${meta.cost_optimization.estimated_cost_usd.toFixed(2)}</>
                    )}
                  </p>
                  <p>
                    CSMS entries scanned: {meta.csms_entries_scanned || 'N/A'}
                    {' | '}
                    Date range: {meta.date_range_start} to {meta.date_range_end}
                    {' | '}
                    Scraper v{meta.scraper_version}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAbout(false)}
                className="text-blue-600 hover:text-blue-800 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Filter panel — top for table and map views */}
        {view !== 'dashboard' && (
          <FilterPanel
            filters={filters}
            filterOptions={filterOptions}
            updateFilter={updateFilter}
            clearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {/* View-specific content */}
        {view === 'dashboard' && (
          <DashboardView
            stats={stats}
            filteredActions={filteredActions}
            onSelectAction={setSelectedAction}
          />
        )}
        {view === 'table' && (
          <TableView
            sortedActions={sortedActions}
            sortField={sortField}
            sortDirection={sortDirection}
            handleSort={handleSort}
            onSelectAction={setSelectedAction}
          />
        )}
        {view === 'map' && (
          <MapView
            filteredActions={filteredActions}
            onSelectAction={setSelectedAction}
          />
        )}
        {view === 'industries' && (
          <IndustryView
            filteredActions={filteredActions}
            onSelectAction={setSelectedAction}
          />
        )}

        {/* Filter panel — bottom for dashboard view */}
        {view === 'dashboard' && (
          <FilterPanel
            filters={filters}
            filterOptions={filterOptions}
            updateFilter={updateFilter}
            clearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        )}
      </main>

      {/* Detail modal */}
      <ActionDetailModal
        action={selectedAction}
        onClose={() => setSelectedAction(null)}
      />
    </div>
  )
}

export default App
