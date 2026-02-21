import { useMemo, useCallback } from 'react'
import {
  datasetNameToTopoName,
  SPECIAL_COUNTRY_VALUES,
} from '../countryCodeMap'

/**
 * Hook that processes filteredActions into map-ready data structures.
 *
 * Choropleth coloring is based on country-SPECIFIC actions only (not "All").
 * "All" actions are tracked separately and shown as a global badge + grouped
 * in the detail panel.
 */
export function useMapData(filteredActions) {
  // Count actions per TopoJSON country name (specific targeting only)
  const countryActionCounts = useMemo(() => {
    const counts = {} // topoName -> count
    for (const action of filteredActions) {
      const countries = action.countries_affected
      if (!Array.isArray(countries)) continue
      for (const name of countries) {
        if (SPECIAL_COUNTRY_VALUES.includes(name)) continue
        const topoName = datasetNameToTopoName(name)
        if (topoName) {
          counts[topoName] = (counts[topoName] || 0) + 1
        }
      }
    }
    return counts
  }, [filteredActions])

  // Actions that affect "All" countries (global actions)
  const globalActions = useMemo(() => {
    return filteredActions.filter((action) => {
      const countries = action.countries_affected
      return Array.isArray(countries) && countries.includes('All')
    })
  }, [filteredActions])

  const allCountryCount = globalActions.length

  // Max count for color scale — based on specific actions only
  const maxCount = useMemo(() => {
    const counts = Object.values(countryActionCounts)
    if (counts.length === 0) return 1
    return Math.max(...counts, 1)
  }, [countryActionCounts])

  // Get the SPECIFIC action count for a TopoJSON feature name (for coloring)
  const getSpecificCountForTopoName = useCallback(
    (topoName) => {
      return countryActionCounts[topoName] || 0
    },
    [countryActionCounts]
  )

  // Get targeted actions for a dataset country name (excludes "All" actions)
  const getTargetedActionsForCountry = useCallback(
    (datasetName) => {
      if (!datasetName) return []
      return filteredActions.filter((action) => {
        const countries = action.countries_affected
        if (!Array.isArray(countries)) return false
        return countries.includes(datasetName)
      })
    },
    [filteredActions]
  )

  return {
    countryActionCounts,
    allCountryCount,
    globalActions,
    maxCount,
    getSpecificCountForTopoName,
    getTargetedActionsForCountry,
  }
}
