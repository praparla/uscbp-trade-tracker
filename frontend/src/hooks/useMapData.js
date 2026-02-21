import { useMemo, useCallback } from 'react'
import {
  datasetNameToTopoName,
  topoNameToDatasetName,
  SPECIAL_COUNTRY_VALUES,
} from '../countryCodeMap'

/**
 * Hook that processes filteredActions into map-ready data structures.
 * Computes action counts per country (keyed by TopoJSON feature name),
 * tracks "All"-country actions separately, and provides a lookup function.
 */
export function useMapData(filteredActions) {
  // Count actions per TopoJSON country name
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

  // Count of actions that affect "All" countries
  const allCountryCount = useMemo(() => {
    let count = 0
    for (const action of filteredActions) {
      const countries = action.countries_affected
      if (Array.isArray(countries) && countries.includes('All')) {
        count++
      }
    }
    return count
  }, [filteredActions])

  // Max count for color scale normalization (minimum 1 to prevent divide-by-zero)
  const maxCount = useMemo(() => {
    const counts = Object.values(countryActionCounts)
    if (counts.length === 0) return Math.max(allCountryCount, 1)
    const maxSpecific = Math.max(...counts)
    return Math.max(maxSpecific + allCountryCount, 1)
  }, [countryActionCounts, allCountryCount])

  // Get the effective action count for a TopoJSON feature name
  const getCountForTopoName = useCallback(
    (topoName) => {
      return (countryActionCounts[topoName] || 0) + allCountryCount
    },
    [countryActionCounts, allCountryCount]
  )

  // Get filtered actions for a dataset country name
  const getActionsForCountry = useCallback(
    (datasetName) => {
      if (!datasetName) return []
      return filteredActions.filter((action) => {
        const countries = action.countries_affected
        if (!Array.isArray(countries)) return false
        return countries.includes(datasetName) || countries.includes('All')
      })
    },
    [filteredActions]
  )

  return {
    countryActionCounts,
    allCountryCount,
    maxCount,
    getCountForTopoName,
    getActionsForCountry,
  }
}
