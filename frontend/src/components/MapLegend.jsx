const GRADIENT_STOPS = [
  { offset: '0%', color: '#f1f5f9' },   // gray-100 (no actions)
  { offset: '30%', color: '#dbeafe' },   // blue-100 (low)
  { offset: '60%', color: '#3b82f6' },   // blue-500 (mid)
  { offset: '100%', color: '#1e3a5f' },  // deep navy (high)
]

export default function MapLegend({ maxCount }) {
  const hasData = maxCount > 0

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 shrink-0">0</span>
        <div className="flex-1 h-2.5 rounded-full overflow-hidden relative">
          {hasData ? (
            <svg width="100%" height="100%" preserveAspectRatio="none">
              <defs>
                <linearGradient id="mapLegendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  {GRADIENT_STOPS.map((stop) => (
                    <stop
                      key={stop.offset}
                      offset={stop.offset}
                      stopColor={stop.color}
                    />
                  ))}
                </linearGradient>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="url(#mapLegendGradient)"
                rx="5"
              />
            </svg>
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-full" />
          )}
        </div>
        <span className="text-xs text-gray-500 shrink-0">
          {hasData ? maxCount : 'No data'}
        </span>
      </div>
      <span className="text-[10px] text-gray-400 mt-1 block">
        Country-targeted trade actions
      </span>
    </div>
  )
}
