import { BarChart3, Table2, Globe } from 'lucide-react'

const views = [
  { key: 'dashboard', label: 'Dashboard', Icon: BarChart3 },
  { key: 'table', label: 'Table', Icon: Table2 },
  { key: 'map', label: 'Map', Icon: Globe },
]

export default function ViewToggle({ view, onViewChange }) {
  return (
    <div className="inline-flex bg-white/10 rounded-lg p-0.5">
      {views.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onViewChange(key)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            view === key
              ? 'bg-white text-navy-900 font-medium shadow-sm'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}
