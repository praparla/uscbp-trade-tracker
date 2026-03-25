import { useMemo } from 'react'
import { RULING_TYPE_COLORS } from '../constants'
import { format, parseISO } from 'date-fns'

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export default function CourtRulingsTimeline({ timelineEvents, onSelectEvent }) {
  const { minDate, maxDate, positioned } = useMemo(() => {
    if (!timelineEvents || timelineEvents.length === 0) {
      return { minDate: null, maxDate: null, positioned: [] }
    }

    const dates = timelineEvents
      .map((e) => e.date)
      .filter(Boolean)
      .sort()

    const min = dates[0]
    const max = dates[dates.length - 1]

    if (!min || !max || min === max) {
      return {
        minDate: min,
        maxDate: max,
        positioned: timelineEvents.map((e) => ({ ...e, pct: 50 })),
      }
    }

    const minMs = new Date(min).getTime()
    const maxMs = new Date(max).getTime()
    const range = maxMs - minMs

    const items = timelineEvents.map((e) => {
      const ms = new Date(e.date).getTime()
      const pct = ((ms - minMs) / range) * 100
      return { ...e, pct: Math.max(2, Math.min(98, pct)) }
    })

    return { minDate: min, maxDate: max, positioned: items }
  }, [timelineEvents])

  if (!timelineEvents || timelineEvents.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center">
        <p className="text-gray-400 text-sm">No timeline events to display.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-5">
      <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">
        Proceedings Timeline
      </h3>

      {/* Date labels */}
      <div className="flex justify-between text-[10px] sm:text-xs text-gray-400 mb-1">
        <span>{formatDate(minDate)}</span>
        <span>{formatDate(maxDate)}</span>
      </div>

      {/* Timeline bar with dots */}
      <div className="relative h-8 bg-gray-100 rounded-full overflow-visible" data-testid="timeline-bar">
        {positioned.map((evt, i) => {
          const color = RULING_TYPE_COLORS[evt.rulingType] || '#94a3b8'
          return (
            <button
              key={`${evt.rulingId}-${i}`}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-white shadow-sm hover:scale-150 transition-transform z-10"
              style={{
                left: `${evt.pct}%`,
                backgroundColor: color,
                transform: `translate(-50%, -50%)`,
              }}
              title={`${evt.caseName}: ${evt.event} (${formatDate(evt.date)})`}
              onClick={() => onSelectEvent && onSelectEvent(evt)}
              data-testid={`timeline-dot-${i}`}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mt-3">
        {Object.entries(RULING_TYPE_COLORS).map(([type, color]) => {
          const hasType = timelineEvents.some((e) => e.rulingType === type)
          if (!hasType) return null
          return (
            <div key={type} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] sm:text-xs text-gray-500 capitalize">
                {type.replace('_', ' ')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
