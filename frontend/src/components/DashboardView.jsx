import { SearchX } from 'lucide-react'
import SummaryCards from './SummaryCards'
import CountryChart from './CountryChart'
import TypeChart from './TypeChart'
import TimelineChart from './TimelineChart'

export default function DashboardView({ stats, filteredActions, onSelectAction }) {
  if (filteredActions.length === 0) {
    return (
      <div className="space-y-6">
        <SummaryCards stats={stats} />
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
          <SearchX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No trade actions match your filters.</p>
          <p className="text-gray-400 text-xs mt-1">Try adjusting or clearing filters above.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards row */}
      <SummaryCards stats={stats} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CountryChart countryCounts={stats.countryCounts} />
        <TypeChart typeCounts={stats.typeCounts} />
      </div>

      {/* Timeline strip */}
      <TimelineChart actions={filteredActions} onSelectAction={onSelectAction} />
    </div>
  )
}
