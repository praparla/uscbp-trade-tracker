import { Activity, CheckCircle2, Globe, Tag } from 'lucide-react'
import { ACTION_TYPE_LABELS } from '../constants'

const cards = [
  {
    key: 'total',
    label: 'Total Actions',
    icon: Activity,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    getValue: (stats) => stats.total,
  },
  {
    key: 'active',
    label: 'Active Actions',
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50',
    getValue: (stats) => stats.active,
  },
  {
    key: 'topCountry',
    label: 'Most Affected Country',
    icon: Globe,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    getValue: (stats) =>
      stats.topCountry ? `${stats.topCountry.name}` : '--',
    getSub: (stats) =>
      stats.topCountry ? `${stats.topCountry.count} actions` : null,
  },
  {
    key: 'topType',
    label: 'Most Common Type',
    icon: Tag,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    getValue: (stats) =>
      stats.topType
        ? ACTION_TYPE_LABELS[stats.topType.name] || stats.topType.name
        : '--',
    getSub: (stats) =>
      stats.topType ? `${stats.topType.count} actions` : null,
  },
]

export default function SummaryCards({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.key}
            className="bg-white border border-gray-200 rounded-lg shadow-sm p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`${card.bg} p-2 rounded-lg`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {card.label}
                </p>
                <p className="text-xl font-bold text-gray-900 truncate">
                  {card.getValue(stats)}
                </p>
                {card.getSub && (
                  <p className="text-xs text-gray-400">{card.getSub(stats)}</p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
