import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Scale } from 'lucide-react'
import {
  RULING_TYPE_COLORS,
  RULING_TYPE_LABELS,
  RULING_STATUS_COLORS,
  OUTCOME_LABELS,
} from '../constants'
import { format, parseISO } from 'date-fns'

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

const EVENT_TYPE_ICONS = {
  filing: 'bg-blue-500',
  argument: 'bg-amber-500',
  ruling: 'bg-green-500',
  motion: 'bg-gray-500',
  executive_action: 'bg-teal-500',
}

export default function CourtRulingCard({ ruling, onSelectRuling }) {
  const [expanded, setExpanded] = useState(false)

  const typeColor = RULING_TYPE_COLORS[ruling.ruling_type] || '#94a3b8'
  const typeLabel = RULING_TYPE_LABELS[ruling.ruling_type] || ruling.ruling_type
  const statusStyle = RULING_STATUS_COLORS[ruling.status] || RULING_STATUS_COLORS.pending

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 sm:px-5 py-3 sm:py-4 hover:bg-gray-50 transition-colors"
        data-testid={`court-ruling-card-${ruling.id}`}
      >
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
              <span
                className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium text-white flex-shrink-0"
                style={{ backgroundColor: typeColor }}
              >
                {typeLabel}
              </span>
              <span
                className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
              >
                {ruling.status}
              </span>
              {ruling.outcome && (
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium bg-gray-100 text-gray-700">
                  {OUTCOME_LABELS[ruling.outcome] || ruling.outcome}
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
              {ruling.case_name}
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
              {ruling.court} {ruling.case_number ? `· ${ruling.case_number}` : ''}
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(ruling.affected_tariff_programs || []).map((prog) => (
                <span
                  key={prog}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium bg-indigo-50 text-indigo-700"
                >
                  {prog}
                </span>
              ))}
              {(ruling.affected_countries || []).slice(0, 3).map((country) => (
                <span
                  key={country}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium bg-gray-100 text-gray-600"
                >
                  {country}
                </span>
              ))}
              {(ruling.affected_countries || []).length > 3 && (
                <span className="text-[9px] sm:text-[10px] text-gray-400">
                  +{ruling.affected_countries.length - 3} more
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-[10px] sm:text-xs text-gray-400">
              {formatDate(ruling.ruling_date || ruling.filing_date)}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 sm:px-5 py-3 sm:py-4 space-y-3 sm:space-y-4">
          {/* Summary */}
          <div>
            <h4 className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Summary
            </h4>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              {ruling.summary}
            </p>
          </div>

          {/* Key legal question */}
          {ruling.key_legal_question && (
            <div className="border-l-3 border-indigo-400 pl-3">
              <h4 className="text-[10px] sm:text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1">
                Key Legal Question
              </h4>
              <p className="text-xs sm:text-sm text-gray-700 italic">
                {ruling.key_legal_question}
              </p>
            </div>
          )}

          {/* Parties */}
          {(ruling.plaintiff || ruling.defendant) && (
            <div className="grid grid-cols-2 gap-3">
              {ruling.plaintiff && (
                <div>
                  <h4 className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                    Plaintiff
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-700">{ruling.plaintiff}</p>
                </div>
              )}
              {ruling.defendant && (
                <div>
                  <h4 className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                    Defendant
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-700">{ruling.defendant}</p>
                </div>
              )}
            </div>
          )}

          {/* Timeline events */}
          {ruling.timeline_events && ruling.timeline_events.length > 0 && (
            <div>
              <h4 className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Proceedings Timeline
              </h4>
              <div className="space-y-2">
                {ruling.timeline_events.map((evt, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex flex-col items-center mt-0.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${EVENT_TYPE_ICONS[evt.type] || 'bg-gray-400'}`}
                      />
                      {i < ruling.timeline_events.length - 1 && (
                        <span className="w-px h-4 bg-gray-200 mt-0.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-700">{evt.event}</p>
                      <p className="text-[10px] sm:text-xs text-gray-400">
                        {formatDate(evt.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key dates */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <h4 className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                Filed
              </h4>
              <p className="text-xs sm:text-sm text-gray-700">{formatDate(ruling.filing_date)}</p>
            </div>
            <div>
              <h4 className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                Argued
              </h4>
              <p className="text-xs sm:text-sm text-gray-700">{formatDate(ruling.argument_date)}</p>
            </div>
            <div>
              <h4 className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                Decided
              </h4>
              <p className="text-xs sm:text-sm text-gray-700">{formatDate(ruling.ruling_date)}</p>
            </div>
          </div>

          {/* Source link */}
          {ruling.source_url && (
            <div className="pt-2 border-t border-gray-100">
              <a
                href={ruling.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {ruling.source_name || 'View source'}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
