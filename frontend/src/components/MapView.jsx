import { useState, useMemo, useCallback } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps'
import { SearchX, Globe } from 'lucide-react'
import { useMapData } from '../hooks/useMapData'
import { topoNameToDatasetName } from '../countryCodeMap'
import MapCountryDetail from './MapCountryDetail'
import MapLegend from './MapLegend'
import topojsonData from '../data/countries-110m.json'

// Choropleth color stops: gray → light blue → blue → deep navy
const COLOR_STOPS = [
  [0.0, [241, 245, 249]],    // #f1f5f9 gray-100
  [0.15, [219, 234, 254]],   // #dbeafe blue-100
  [0.5, [59, 130, 246]],     // #3b82f6 blue-500
  [1.0, [30, 58, 95]],       // #1e3a5f deep navy
]

function getColorForCount(count, maxCount) {
  if (count === 0) return '#f1f5f9'
  const ratio = Math.max(0, Math.min(count / maxCount, 1))

  let lower = COLOR_STOPS[0]
  let upper = COLOR_STOPS[COLOR_STOPS.length - 1]
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (ratio >= COLOR_STOPS[i][0] && ratio <= COLOR_STOPS[i + 1][0]) {
      lower = COLOR_STOPS[i]
      upper = COLOR_STOPS[i + 1]
      break
    }
  }

  const range = upper[0] - lower[0]
  const t = range === 0 ? 0 : (ratio - lower[0]) / range
  const r = Math.round(lower[1][0] + (upper[1][0] - lower[1][0]) * t)
  const g = Math.round(lower[1][1] + (upper[1][1] - lower[1][1]) * t)
  const b = Math.round(lower[1][2] + (upper[1][2] - lower[1][2]) * t)
  return `rgb(${r},${g},${b})`
}

function clampTooltipPosition(x, y) {
  const pad = 16
  const tooltipW = 200
  const tooltipH = 70

  let left = x + 12
  let top = y - tooltipH - 8

  if (left + tooltipW > window.innerWidth - pad) {
    left = x - tooltipW - 12
  }
  if (top < pad) {
    top = y + 16
  }

  return { left, top }
}

export default function MapView({ filteredActions, onSelectAction }) {
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [tooltip, setTooltip] = useState(null)

  const {
    allCountryCount,
    globalActions,
    maxCount,
    getSpecificCountForTopoName,
    getTargetedActionsForCountry,
  } = useMapData(filteredActions)

  // Get grouped actions for the selected country
  const selectedTargetedActions = useMemo(() => {
    if (!selectedCountry) return []
    return getTargetedActionsForCountry(selectedCountry)
  }, [selectedCountry, getTargetedActionsForCountry])

  const handleCountryClick = useCallback(
    (geo) => {
      const topoName = geo.properties?.name
      if (!topoName) return
      const datasetName = topoNameToDatasetName(topoName)
      setSelectedCountry((prev) => (prev === datasetName ? null : datasetName))
    },
    []
  )

  const handleMouseEnter = useCallback(
    (geo, event) => {
      const topoName = geo.properties?.name
      if (!topoName) return
      const clientX = event?.clientX
      const clientY = event?.clientY
      if (typeof clientX !== 'number' || typeof clientY !== 'number') return

      const datasetName = topoNameToDatasetName(topoName)
      const specificCount = getSpecificCountForTopoName(topoName)
      setTooltip({
        name: datasetName,
        specificCount,
        globalCount: allCountryCount,
        x: clientX,
        y: clientY,
      })
    },
    [getSpecificCountForTopoName, allCountryCount]
  )

  const handleMouseMove = useCallback(
    (event) => {
      if (!tooltip) return
      const clientX = event?.clientX
      const clientY = event?.clientY
      if (typeof clientX !== 'number' || typeof clientY !== 'number') return
      setTooltip((prev) => (prev ? { ...prev, x: clientX, y: clientY } : null))
    },
    [tooltip]
  )

  const handleMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  // Empty state
  if (filteredActions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
        <SearchX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">
          No trade actions match your filters.
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Try adjusting or clearing filters above.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Map + Legend */}
        <div
          className={`transition-all duration-300 ${
            selectedCountry ? 'xl:w-3/5' : 'w-full'
          }`}
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                Trade Actions by Country
              </h3>

              {/* Global actions badge */}
              {allCountryCount > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-full">
                  <Globe className="w-3 h-3 text-indigo-500" />
                  <span className="text-xs font-medium text-indigo-700">
                    {allCountryCount} global action{allCountryCount !== 1 ? 's' : ''} apply to all countries
                  </span>
                </div>
              )}
            </div>

            <div className="relative">
              <ComposableMap
                projection="geoEqualEarth"
                projectionConfig={{ scale: 155, center: [0, 5] }}
                width={800}
                height={420}
                style={{ width: '100%', height: 'auto' }}
              >
                <Geographies geography={topojsonData}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const topoName = geo.properties?.name
                      const specificCount = topoName
                        ? getSpecificCountForTopoName(topoName)
                        : 0
                      const datasetName = topoName
                        ? topoNameToDatasetName(topoName)
                        : null
                      const isSelected = selectedCountry === datasetName

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={getColorForCount(specificCount, maxCount)}
                          stroke={isSelected ? '#1a2332' : '#e2e8f0'}
                          strokeWidth={isSelected ? 1.5 : 0.5}
                          style={{
                            default: { outline: 'none' },
                            hover: {
                              outline: 'none',
                              fill: isSelected
                                ? getColorForCount(specificCount, maxCount)
                                : '#93c5fd',
                              cursor: 'pointer',
                              strokeWidth: 1,
                            },
                            pressed: { outline: 'none' },
                          }}
                          onClick={() => handleCountryClick(geo)}
                          onMouseEnter={(e) => handleMouseEnter(geo, e)}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                        />
                      )
                    })
                  }
                </Geographies>
              </ComposableMap>
            </div>

            <MapLegend maxCount={maxCount} />
          </div>
        </div>

        {/* Detail panel */}
        {selectedCountry && (
          <div className="xl:w-2/5 animate-slideIn">
            <MapCountryDetail
              countryName={selectedCountry}
              targetedActions={selectedTargetedActions}
              globalActions={globalActions}
              onSelectAction={onSelectAction}
              onClose={() => setSelectedCountry(null)}
            />
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg"
          style={clampTooltipPosition(tooltip.x, tooltip.y)}
        >
          <p className="font-medium">{tooltip.name}</p>
          {tooltip.specificCount > 0 ? (
            <>
              <p className="text-blue-300">
                {tooltip.specificCount} targeted action{tooltip.specificCount !== 1 ? 's' : ''}
              </p>
              {tooltip.globalCount > 0 && (
                <p className="text-gray-400">
                  +{tooltip.globalCount} global
                </p>
              )}
            </>
          ) : tooltip.globalCount > 0 ? (
            <p className="text-gray-400">
              {tooltip.globalCount} global action{tooltip.globalCount !== 1 ? 's' : ''} only
            </p>
          ) : (
            <p className="text-gray-400">No trade actions</p>
          )}
        </div>
      )}
    </div>
  )
}
