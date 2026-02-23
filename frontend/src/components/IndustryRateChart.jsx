import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useMediaQuery } from '../hooks/useMediaQuery'

export default function IndustryRateChart({ rateChartData }) {
  const { isMobile } = useMediaQuery()

  if (rateChartData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Max Tariff Rate by Sector</h3>
        <div className="h-[220px] sm:h-[280px] flex items-center justify-center text-gray-400 text-sm">
          No rate data to display
        </div>
      </div>
    )
  }

  const sorted = [...rateChartData].sort((a, b) => b.maxRate - a.maxRate)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3 sm:mb-4">
        Max Tariff Rate by Sector
      </h3>
      <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
        <BarChart data={sorted} layout="vertical" margin={{ left: isMobile ? 10 : 30, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            type="number"
            tick={{ fontSize: isMobile ? 10 : 12 }}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 'auto']}
          />
          <YAxis
            dataKey="sector"
            type="category"
            tick={{ fontSize: isMobile ? 9 : 11 }}
            width={isMobile ? 100 : 140}
          />
          <Tooltip
            contentStyle={{
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)',
            }}
            formatter={(value) => [`${value}%`, 'Max Rate']}
          />
          <Bar dataKey="maxRate" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {sorted.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
