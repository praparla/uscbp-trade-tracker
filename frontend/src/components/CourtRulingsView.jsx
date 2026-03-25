import { SearchX, Scale, Gavel, AlertTriangle } from 'lucide-react'
import { useCourtRulings } from '../hooks/useCourtRulings'
import CourtRulingCard from './CourtRulingCard'
import CourtRulingsTimeline from './CourtRulingsTimeline'

export default function CourtRulingsView({ filters, onSelectAction }) {
  const {
    sortedRulings,
    stats,
    timelineEvents,
  } = useCourtRulings(filters)

  if (sortedRulings.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 sm:p-12 text-center">
          <SearchX className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No court rulings match your filters.</p>
          <p className="text-gray-400 text-xs mt-1">Try adjusting or clearing filters above.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-indigo-50 p-1.5 sm:p-2 rounded-lg">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Total Cases</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-yellow-50 p-1.5 sm:p-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Pending</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-purple-50 p-1.5 sm:p-2 rounded-lg">
              <Gavel className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Programs Challenged</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.programsChallenged}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <CourtRulingsTimeline timelineEvents={timelineEvents} />

      {/* Ruling cards */}
      <div className="space-y-3 sm:space-y-4">
        {sortedRulings.map((ruling) => (
          <CourtRulingCard
            key={ruling.id}
            ruling={ruling}
          />
        ))}
      </div>

      {/* Source disclaimer */}
      <div className="text-[10px] sm:text-xs text-gray-400 px-1" data-testid="court-rulings-disclaimer">
        All court ruling data sourced from official .gov sources including supremecourt.gov,
        cit.uscourts.gov, cafc.uscourts.gov, congress.gov, and whitehouse.gov.
      </div>
    </div>
  )
}
