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
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
        data-testid={`industry-card-${sector.id}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: sector.color }}
              />
              <h3 className="text-base font-semibold text-gray-900">
                {sector.label}
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-2">{sector.description}</p>

            {/* Metric pills */}
            <div className="flex flex-wrap gap-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sector.bgColor} ${sector.textColor}`}>
                {sector.actionCount} actions
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                {sector.activeCount} active
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {sector.dutyRateRange}
              </span>
              {sector.countries.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {sector.countries.length} countries
                </span>
              )}
              {sector.hsCodeCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {sector.hsCodeCount} HS codes
                </span>
              )}
            </div>

            {/* Key metric */}
            {sector.estimates.keyMetric && (
              <p className="text-xs text-gray-600 mt-2 italic">
                {sector.estimates.keyMetric}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 text-gray-400 mt-1">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Verified data section */}
          {sector.estimates.verified.length > 0 && (
            <div className="border-l-3 border-blue-400 pl-3" data-testid="verified-section">
              <div className="flex items-center gap-1.5 mb-2">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Verified from CSMS Bulletins
                </h4>
              </div>
              <ul className="space-y-1.5">
                {sector.estimates.verified.map((v, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    {v.claim}: <span className="font-semibold">{v.value}</span>
                    {v.csms_id && (
                      <span className="text-xs text-blue-500 ml-1">
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
                <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  External Estimates (not from CBP data)
                </h4>
              </div>
              <ul className="space-y-1.5">
                {sector.estimates.external.map((ext, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    {ext.claim}: <span className="font-semibold">{ext.value}</span>
                    <span className="text-xs text-gray-400 ml-1">
                      Source: {ext.source}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action list */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
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
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
                      data-testid={`action-row-${action.id}`}
                    >
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white flex-shrink-0"
                        style={{ backgroundColor: typeColor }}
                      >
                        {ACTION_TYPE_LABELS[action.action_type] || action.action_type}
                      </span>
                      <span className="text-sm text-gray-800 truncate flex-1">
                        {action.title}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatDate(action.effective_date)}
                      </span>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusStyle.dot}`} />
                      {action.duty_rate && (
                        <span className="text-xs text-gray-500 font-mono flex-shrink-0">
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
