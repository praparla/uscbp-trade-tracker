import { X, MapPin, AlertCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import {
  ACTION_TYPE_COLORS,
  ACTION_TYPE_LABELS,
  STATUS_COLORS,
} from '../constants'

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export default function MapCountryDetail({
  countryName,
  actions,
  onSelectAction,
  onClose,
}) {
  const safeActions = Array.isArray(actions) ? actions : []

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
          <h3 className="font-medium text-gray-900 truncate" title={countryName}>
            {countryName}
          </h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 shrink-0">
            {safeActions.length} action{safeActions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded-md text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          aria-label="Close country detail"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action list */}
      <div className="max-h-[400px] xl:max-h-[calc(100vh-320px)] overflow-y-auto">
        {safeActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 text-center">
              No trade actions match current filters for {countryName}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {safeActions.map((action) => {
              const typeColor =
                ACTION_TYPE_COLORS[action.action_type] ||
                ACTION_TYPE_COLORS.other
              const typeLabel =
                ACTION_TYPE_LABELS[action.action_type] ||
                action.action_type ||
                'Other'
              const statusStyle =
                STATUS_COLORS[action.status] || STATUS_COLORS.active

              return (
                <button
                  key={action.id}
                  onClick={() => onSelectAction(action)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    {/* Type badge */}
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: typeColor }}
                    >
                      {typeLabel}
                    </span>

                    <div className="min-w-0 flex-1">
                      {/* Title */}
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {action.title}
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatDate(action.effective_date)}
                        </span>

                        {/* Status dot */}
                        <span className="flex items-center gap-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
                          />
                          <span className={`text-[10px] ${statusStyle.text}`}>
                            {action.status}
                          </span>
                        </span>

                        {/* Duty rate if present */}
                        {action.duty_rate && (
                          <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1 rounded">
                            {action.duty_rate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
