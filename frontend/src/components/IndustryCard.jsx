import { useState } from 'react'
import { ChevronDown, ChevronUp, Shield, AlertTriangle } from 'lucide-react'
import { ACTION_TYPE_COLORS, ACTION_TYPE_LABELS, STATUS_COLORS } from '../constants'
import { format, parseISO } from 'date-fns'

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export default function IndustryCard({ sector, onSelectAction }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`bg-white border rounded-lg shadow-sm overflow-hidden ${sector.borderColor}`}
    >
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 sm:px-5 py-3 sm:py-4 hover:bg-gray-50 transition-colors"
        data-testid={`industry-card-${sector.id}`}
      >
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
              <span
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: sector.color }}
              />
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                {sector.label}
              </h3>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mb-1.5 sm:mb-2">{sector.description}</p>

            {/* Metric pills */}
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${sector.bgColor} ${sector.textColor}`}>
                {sector.actionCount} actions
              </span>
              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-50 text-green-700">
                {sector.activeCount} active
              </span>
              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-700">
                {sector.dutyRateRange}
              </span>
              {sector.countries.length > 0 && (
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-600">
                  {sector.countries.length} countries
                </span>
              )}
              {sector.hsCodeCount > 0 && (
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-50 text-blue-700">
                  {sector.hsCodeCount} HS codes
                </span>
              )}
            </div>

            {sector.estimates.keyMetric && (
              <p className="text-[10px] sm:text-xs text-gray-600 mt-1.5 sm:mt-2 italic">
                {sector.estimates.keyMetric}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 text-gray-400 mt-1">
            {expanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 sm:px-5 py-3 sm:py-4 space-y-3 sm:space-y-4">
          {/* Verified data section */}
          {sector.estimates.verified.length > 0 && (
            <div className="border-l-3 border-blue-400 pl-3" data-testid="verified-section">
              <div className="flex items-center gap-1.5 mb-2">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <h4 className="text-[10px] sm:text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Verified from CSMS Bulletins
                </h4>
              </div>
              <ul className="space-y-1.5">
                {sector.estimates.verified.map((v, i) => (
                  <li key={i} className="text-xs sm:text-sm text-gray-700">
                    {v.claim}: <span className="font-semibold">{v.value}</span>
                    {v.csms_id && (
                      <span className="text-[10px] sm:text-xs text-blue-500 ml-1">
                        CSMS #{v.csms_id}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* External estimates section */}
          {sector.estimates.external.length > 0 && (
            <div className="border-l-3 border-amber-400 pl-3" data-testid="external-section">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <h4 className="text-[10px] sm:text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  External Estimates
                </h4>
              </div>
              <ul className="space-y-1.5">
                {sector.estimates.external.map((ext, i) => (
                  <li key={i} className="text-xs sm:text-sm text-gray-700">
                    {ext.claim}: <span className="font-semibold">{ext.value}</span>
                    {ext.url ? (
                      <a
                        href={ext.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] sm:text-xs text-blue-500 hover:text-blue-700 hover:underline ml-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Source: {ext.source}
                      </a>
                    ) : (
                      <span className="text-[10px] sm:text-xs text-gray-400 ml-1">
                        Source: {ext.source}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action list */}
          <div>
            <h4 className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Trade Actions ({sector.actions.length})
            </h4>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {[...sector.actions]
                .sort((a, b) => (b.effective_date || '').localeCompare(a.effective_date || ''))
                .map((action) => {
                  const typeColor = ACTION_TYPE_COLORS[action.action_type] || ACTION_TYPE_COLORS.other
                  const statusStyle = STATUS_COLORS[action.status] || STATUS_COLORS.active
                  return (
                    <button
                      key={action.id}
                      onClick={() => onSelectAction(action)}
                      className="w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5 sm:gap-2"
                      data-testid={`action-row-${action.id}`}
                    >
                      <span
                        className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium text-white flex-shrink-0"
                        style={{ backgroundColor: typeColor }}
                      >
                        {ACTION_TYPE_LABELS[action.action_type] || action.action_type}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-800 truncate flex-1">
                        {action.title}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-400 flex-shrink-0 hidden xs:inline">
                        {formatDate(action.effective_date)}
                      </span>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusStyle.dot}`} />
                      {action.duty_rate && (
                        <span className="text-[10px] sm:text-xs text-gray-500 font-mono flex-shrink-0 hidden sm:inline">
                          {action.duty_rate}
                        </span>
                      )}
                    </button>
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
