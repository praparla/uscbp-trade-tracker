import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ACTION_TYPE_COLORS } from '../constants'

export default function TimelineChart({ actions, onSelectAction }) {
  const timelineData = useMemo(() => {
    return actions
      .filter((a) => a.effective_date)
      .sort((a, b) => a.effective_date.localeCompare(b.effective_date))
  }, [actions])

  // Compute the date range for positioning
  const { minDate, maxDate, range } = useMemo(() => {
    if (timelineData.length === 0) return { minDate: null, maxDate: null, range: 1 }
    const dates = timelineData.map((a) => new Date(a.effective_date).getTime())
    const min = Math.min(...dates)
    const max = Math.max(...dates)
    // Add 5% padding on each side
    const padding = (max - min) * 0.05 || 86400000 // at least 1 day
    return {
      minDate: min - padding,
      maxDate: max + padding,
      range: max - min + padding * 2 || 1,
    }
  }, [timelineData])

  // Generate month labels
  const monthLabels = useMemo(() => {
    if (!minDate || !maxDate) return []
    const labels = []
    const start = new Date(minDate)
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(maxDate)

    const current = new Date(start)
    while (current <= end) {
      const ts = current.getTime()
      if (ts >= minDate && ts <= maxDate) {
        labels.push({
          label: format(current, 'MMM yyyy'),
          position: ((ts - minDate) / range) * 100,
        })
      }
      current.setMonth(current.getMonth() + 1)
    }
    return labels
  }, [minDate, maxDate, range])

  if (timelineData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Timeline</h3>
        <div className="h-16 flex items-center justify-center text-gray-400 text-sm">
          No dated actions to display
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Timeline</h3>
      <div className="relative">
        {/* Month labels */}
        <div className="relative h-5 mb-1">
          {monthLabels.map((m, i) => (
            <span
              key={i}
              className="absolute text-[10px] text-gray-400 -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${m.position}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* Timeline bar */}
        <div className="relative h-12 bg-gray-100 rounded-full overflow-visible">
          {/* Track line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300 -translate-y-1/2" />

          {/* Dots */}
          {timelineData.map((action, i) => {
            const ts = new Date(action.effective_date).getTime()
            const left = ((ts - minDate) / range) * 100
            const color =
              ACTION_TYPE_COLORS[action.action_type] || ACTION_TYPE_COLORS.other

            return (
              <button
                key={action.id}
                onClick={() => onSelectAction(action)}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group z-10"
                style={{ left: `${left}%` }}
                title={`${action.title} (${format(parseISO(action.effective_date), 'MMM d, yyyy')})`}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-150"
                  style={{ backgroundColor: color }}
                />
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 pointer-events-none">
                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                    <p className="font-medium line-clamp-2">{action.title}</p>
                    <p className="text-gray-300 mt-0.5">
                      {format(parseISO(action.effective_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
