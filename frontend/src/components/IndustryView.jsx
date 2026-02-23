import { SearchX, Factory, TrendingUp, BarChart3 } from 'lucide-react'
import { useIndustryData } from '../hooks/useIndustryData'
import IndustryComparisonChart from './IndustryComparisonChart'
import IndustryRateChart from './IndustryRateChart'
import IndustryCard from './IndustryCard'

export default function IndustryView({ filteredActions, onSelectAction }) {
  const {
    sectors,
    chartData,
    rateChartData,
    totalIndustries,
    totalMappedActions,
  } = useIndustryData(filteredActions)

  if (filteredActions.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 sm:p-12 text-center">
          <SearchX className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No trade actions match your filters.</p>
          <p className="text-gray-400 text-xs mt-1">Try adjusting or clearing filters above.</p>
        </div>
      </div>
    )
  }

  const largestSector = sectors.length > 0
    ? sectors.reduce((a, b) => (a.actionCount >= b.actionCount ? a : b))
    : null

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-indigo-50 p-1.5 sm:p-2 rounded-lg">
              <Factory className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Industries Affected</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{totalIndustries}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-blue-50 p-1.5 sm:p-2 rounded-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Largest Sector</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {largestSector ? largestSector.label : '--'}
              </p>
              {largestSector && (
                <p className="text-[10px] sm:text-xs text-gray-400">{largestSector.actionCount} actions</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-amber-50 p-1.5 sm:p-2 rounded-lg">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Sector-Actions</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{totalMappedActions}</p>
              <p className="text-[10px] sm:text-xs text-gray-400">incl. multi-sector</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <IndustryComparisonChart chartData={chartData} />
        <IndustryRateChart rateChartData={rateChartData} />
      </div>

      {/* Sector cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {sectors.map((sector) => (
          <IndustryCard
            key={sector.id}
            sector={sector}
            onSelectAction={onSelectAction}
          />
        ))}
      </div>

      {/* Source disclaimer */}
      <div className="text-[10px] sm:text-xs text-gray-400 px-1" data-testid="industry-disclaimer">
        Verified data cited from CSMS bulletins (see CSMS # references). External estimates
        sourced from public policy analysis — not from CBP data.
      </div>
    </div>
  )
}
