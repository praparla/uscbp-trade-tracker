import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { ACTION_TYPE_COLORS, ACTION_TYPE_LABELS } from '../constants'
import { useMediaQuery } from '../hooks/useMediaQuery'

export default function TypeChart({ typeCounts }) {
  const { isMobile } = useMediaQuery()

  const data = useMemo(() => {
    return Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name: ACTION_TYPE_LABELS[name] || name,
        value,
        type: name,
      }))
  }, [typeCounts])

  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Actions by Type</h3>
        <div className="h-[220px] sm:h-[280px] flex items-center justify-center text-gray-400 text-sm">
          No data to display
        </div>
      </div>
    )
  }

  const renderLabel = ({ name, percent }) => {
    if (percent < 0.06) return null
    return `${(percent * 100).toFixed(0)}%`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3 sm:mb-4">Actions by Type</h3>
      <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={isMobile ? 40 : 55}
            outerRadius={isMobile ? 70 : 95}
            paddingAngle={2}
            dataKey="value"
            label={isMobile ? false : renderLabel}
            labelLine={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.type}
                fill={ACTION_TYPE_COLORS[entry.type] || ACTION_TYPE_COLORS.other}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: isMobile ? '10px' : '12px' }}
            iconType="circle"
            iconSize={isMobile ? 6 : 8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
