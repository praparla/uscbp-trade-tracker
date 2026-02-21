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

export default function IndustryComparisonChart({ chartData }) {
  if (chartData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Actions by Industry</h3>
        <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
          No data to display
        </div>
      </div>
    )
  }

  const sorted = [...chartData].sort((a, b) => b.actions - a.actions)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <h3 className="text-sm font-medium text-gray-700 mb-4">
        Actions by Industry Sector
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 30, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
          <YAxis
            dataKey="sector"
            type="category"
            tick={{ fontSize: 11 }}
            width={140}
          />
          <Tooltip
            contentStyle={{
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)',
            }}
            formatter={(value, name) => [value, name === 'active' ? 'Active' : 'Total Actions']}
          />
          <Bar dataKey="actions" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {sorted.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
