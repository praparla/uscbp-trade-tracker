import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Download } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ACTION_TYPE_COLORS, ACTION_TYPE_LABELS, STATUS_COLORS, ITEMS_PER_PAGE } from '../constants'
import { useMediaQuery } from '../hooks/useMediaQuery'

export default function TableView({
  sortedActions,
  sortField,
  sortDirection,
  handleSort,
  onSelectAction,
}) {
  const [page, setPage] = useState(0)
  const { isMobile } = useMediaQuery()

  const totalPages = Math.ceil(sortedActions.length / ITEMS_PER_PAGE)
  const pageActions = useMemo(
    () => sortedActions.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE),
    [sortedActions, page]
  )

  useMemo(() => {
    if (page >= totalPages && totalPages > 0) setPage(0)
  }, [totalPages, page])

  const formatDate = (dateStr) => {
    if (!dateStr) return '--'
    try {
      return format(parseISO(dateStr), isMobile ? 'MMM d' : 'MMM d, yyyy')
    } catch {
      return dateStr
    }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field)
      return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
    )
  }

  const exportCSV = () => {
    const headers = [
      'Effective Date',
      'Title',
      'Type',
      'Countries',
      'Status',
      'Duty Rate',
      'Summary',
      'HTS Codes',
      'Source',
    ]
    const rows = sortedActions.map((a) => [
      a.effective_date || '',
      `"${(a.title || '').replace(/"/g, '""')}"`,
      a.action_type || '',
      `"${(a.countries_affected || []).join(', ')}"`,
      a.status || '',
      a.duty_rate || '',
      `"${(a.summary || '').replace(/"/g, '""')}"`,
      `"${(a.hs_codes || []).join(', ')}"`,
      a.source_csms_id || '',
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `trade_actions_${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Mobile: card layout
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {sortedActions.length} action{sortedActions.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>

        {/* Card list */}
        <div className="space-y-2">
          {pageActions.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500 text-sm">
              No trade actions match your filters.
            </div>
          ) : (
            pageActions.map((action) => {
              const typeColor =
                ACTION_TYPE_COLORS[action.action_type] || ACTION_TYPE_COLORS.other
              const statusStyle =
                STATUS_COLORS[action.status] || STATUS_COLORS.active

              return (
                <button
                  key={action.id}
                  onClick={() => onSelectAction(action)}
                  className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white"
                      style={{ backgroundColor: typeColor }}
                    >
                      {ACTION_TYPE_LABELS[action.action_type] || action.action_type}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                      {action.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                    {action.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span>{formatDate(action.effective_date)}</span>
                    {(action.countries_affected || []).length > 0 && (
                      <span className="truncate">
                        {action.countries_affected.slice(0, 2).join(', ')}
                        {action.countries_affected.length > 2 && ` +${action.countries_affected.length - 2}`}
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-xs text-gray-500">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2.5 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    )
  }

  // Desktop: table layout
  const columns = [
    { key: 'effective_date', label: 'Effective Date', sortable: true, width: 'w-[120px]' },
    { key: 'title', label: 'Title', sortable: true, width: 'flex-1' },
    { key: 'action_type', label: 'Type', sortable: true, width: 'w-[110px]' },
    { key: 'countries', label: 'Countries', sortable: false, width: 'w-[160px]' },
    { key: 'status', label: 'Status', sortable: true, width: 'w-[90px]' },
    { key: 'summary', label: 'Summary', sortable: false, width: 'w-[280px]' },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Table header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          {sortedActions.length} action{sortedActions.length !== 1 ? 's' : ''}
          {totalPages > 1 && (
            <span className="text-gray-400">
              {' '}(page {page + 1} of {totalPages})
            </span>
          )}
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto table-scroll">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${col.width} px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    col.sortable ? 'cursor-pointer hover:text-gray-700 select-none' : ''
                  }`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon field={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageActions.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                  No trade actions match your filters.
                </td>
              </tr>
            ) : (
              pageActions.map((action) => {
                const typeColor =
                  ACTION_TYPE_COLORS[action.action_type] || ACTION_TYPE_COLORS.other
                const statusStyle =
                  STATUS_COLORS[action.status] || STATUS_COLORS.active

                return (
                  <tr
                    key={action.id}
                    onClick={() => onSelectAction(action)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {formatDate(action.effective_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 line-clamp-1">
                        {action.title}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: typeColor }}
                      >
                        {ACTION_TYPE_LABELS[action.action_type] || action.action_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(action.countries_affected || []).slice(0, 3).map((c) => (
                          <span
                            key={c}
                            className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {c}
                          </span>
                        ))}
                        {(action.countries_affected || []).length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{action.countries_affected.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        {action.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 line-clamp-2 max-w-[280px]">
                      {action.summary}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum
              if (totalPages <= 7) {
                pageNum = i
              } else if (page < 3) {
                pageNum = i
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 7 + i
              } else {
                pageNum = page - 3 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 text-sm rounded-md ${
                    page === pageNum
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {pageNum + 1}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
