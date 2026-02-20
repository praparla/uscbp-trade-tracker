import { BarChart3, Table2 } from 'lucide-react'

export default function ViewToggle({ view, onViewChange }) {
  return (
    <div className="inline-flex bg-white/10 rounded-lg p-0.5">
      <button
        onClick={() => onViewChange('dashboard')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
          view === 'dashboard'
            ? 'bg-white text-navy-900 font-medium shadow-sm'
            : 'text-white/80 hover:text-white hover:bg-white/10'
        }`}
      >
        <BarChart3 className="w-3.5 h-3.5" />
        Dashboard
      </button>
      <button
        onClick={() => onViewChange('table')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
          view === 'table'
            ? 'bg-white text-navy-900 font-medium shadow-sm'
            : 'text-white/80 hover:text-white hover:bg-white/10'
        }`}
      >
        <Table2 className="w-3.5 h-3.5" />
        Table
      </button>
    </div>
  )
}
