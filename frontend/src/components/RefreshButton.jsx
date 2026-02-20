import { RefreshCw } from 'lucide-react'

export default function RefreshButton({ isDevMode, isRefreshing, onRefresh }) {
  if (!isDevMode) return null

  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors disabled:opacity-50"
      title="Re-run scraper pipeline"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
    </button>
  )
}
