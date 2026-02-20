import { X, ExternalLink, Calendar, MapPin, FileText, Tag } from 'lucide-react'
import { ACTION_TYPE_COLORS, ACTION_TYPE_LABELS, STATUS_COLORS } from '../constants'
import { format, parseISO } from 'date-fns'

export default function ActionDetailModal({ action, onClose }) {
  if (!action) return null

  const typeColor = ACTION_TYPE_COLORS[action.action_type] || ACTION_TYPE_COLORS.other
  const statusStyle = STATUS_COLORS[action.status] || STATUS_COLORS.active

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: typeColor }}
                >
                  {ACTION_TYPE_LABELS[action.action_type] || action.action_type}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                  {action.status}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                {action.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Summary */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Summary</h3>
            <p className="text-sm text-gray-800 leading-relaxed">{action.summary}</p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Effective Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(action.effective_date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Expiration Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(action.expiration_date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Countries Affected</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(action.countries_affected || []).map((c) => (
                    <span
                      key={c}
                      className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Source</p>
                <p className="text-sm text-gray-900">{action.source_csms_id}</p>
              </div>
            </div>
          </div>

          {/* Duty rate (extended field) */}
          {action.duty_rate && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Duty Rate</h3>
              <p className="text-sm text-gray-800 font-mono bg-gray-50 px-3 py-2 rounded-md">
                {action.duty_rate}
              </p>
            </div>
          )}

          {/* Federal authority */}
          {action.federal_authority && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Federal Authority</h3>
              <p className="text-sm text-gray-800">{action.federal_authority}</p>
            </div>
          )}

          {/* HS Codes */}
          {action.hs_codes && action.hs_codes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Tag className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-medium text-gray-500">HTS Codes</h3>
              </div>
              <div className="flex flex-wrap gap-1">
                {action.hs_codes.map((code) => (
                  <span
                    key={code}
                    className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Raw excerpt */}
          {action.raw_excerpt && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Excerpt</h3>
              <p className="text-xs text-gray-600 italic bg-gray-50 px-3 py-2 rounded-md border-l-2 border-gray-300">
                {action.raw_excerpt}
              </p>
            </div>
          )}

          {/* Source link */}
          {action.source_url && (
            <div className="pt-2 border-t border-gray-100">
              <a
                href={action.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View source document
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
