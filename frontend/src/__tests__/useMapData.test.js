import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMapData } from '../hooks/useMapData'

function makeAction(id, countries, type = 'tariff') {
  return {
    id,
    title: `Action ${id}`,
    countries_affected: countries,
    action_type: type,
    status: 'active',
    effective_date: '2025-06-01',
  }
}

describe('useMapData', () => {
  describe('countryActionCounts', () => {
    it('counts actions per country (TopoJSON name)', () => {
      const actions = [
        makeAction('1', ['China']),
        makeAction('2', ['China']),
        makeAction('3', ['Canada']),
      ]
      const { result } = renderHook(() => useMapData(actions))
      expect(result.current.countryActionCounts['China']).toBe(2)
      expect(result.current.countryActionCounts['Canada']).toBe(1)
    })

    it('maps dataset names to TopoJSON names for overrides', () => {
      const actions = [
        makeAction('1', ['Bosnia and Herzegovina']),
        makeAction('2', ['Democratic Republic of the Congo']),
      ]
      const { result } = renderHook(() => useMapData(actions))
      // These should be keyed by TopoJSON feature name
      expect(result.current.countryActionCounts['Bosnia and Herz.']).toBe(1)
      expect(result.current.countryActionCounts['Dem. Rep. Congo']).toBe(1)
    })

    it('does not count "All" in per-country counts', () => {
      const actions = [
        makeAction('1', ['All']),
        makeAction('2', ['China']),
      ]
      const { result } = renderHook(() => useMapData(actions))
      expect(result.current.countryActionCounts['All']).toBeUndefined()
      expect(result.current.countryActionCounts['China']).toBe(1)
    })

    it('does not count "Multiple" in per-country counts', () => {
      const actions = [makeAction('1', ['Multiple'])]
      const { result } = renderHook(() => useMapData(actions))
      expect(result.current.countryActionCounts['Multiple']).toBeUndefined()
      expect(Object.keys(result.current.countryActionCounts)).toHaveLength(0)
    })

    it('skips unmappable countries (Hong Kong, Malta, etc.)', () => {
      const actions = [
        makeAction('1', ['Hong Kong']),
        makeAction('2', ['Malta']),
      ]
      const { result } = renderHook(() => useMapData(actions))
      expect(Object.keys(result.current.countryActionCounts)).toHaveLength(0)
    })
  })

  describe('allCountryCount', () => {
    it('counts actions with "All" in countries_affected', () => {
      const actions = [
        makeAction('1', ['All']),
        makeAction('2', ['All']),
        makeAction('3', ['China']),
      ]
      const { result } = renderHook(() => useMapData(actions))
      expect(result.current.allCountryCount).toBe(2)
    })

    it('returns 0 when no "All" actions', () => {
      const actions = [makeAction('1', ['China'])]
      const { result } = renderHook(() => useMapData(actions))
      expect(result.current.allCountryCount).toBe(0)
    })
  })

  describe('maxCount', () => {
    it('is at least 1 even with empty data', () => {
      const { result } = renderHook(() => useMapData([]))
      expect(result.current.maxCount).toBeGreaterThanOrEqual(1)
    })

    it('includes allCountryCount in max calculation', () => {
      const actions = [
        makeAction('1', ['All']),
        makeAction('2', ['China']),
      ]
      const { result } = renderHook(() => useMapData(actions))
      // China: 1 specific + 1 all = 2
      expect(result.current.maxCount).toBe(2)
    })

    it('computes correct max for multiple countries', () => {
      const actions = [
        makeAction('1', ['China']),
        makeAction('2', ['China']),
        makeAction('3', ['China']),
        makeAction('4', ['Canada']),
      ]
      const { result } = renderHook(() => useMapData(actions))
      expect(result.current.maxCount).toBe(3) // China has 3
    })
  })

  describe('getCountForTopoName', () => {
    it('returns count including allCountryCount', () => {
      const actions = [
        makeAction('1', ['All']),
        makeAction('2', ['China']),
      ]
      const { result } = renderHook(() => useMapData(actions))
      expect(result.current.getCountForTopoName('China')).toBe(2) // 1 specific + 1 all
    })

    it('returns just allCountryCount for unknown country', () => {
      const actions = [makeAction('1', ['All'])]
      const { result } = renderHook(() => useMapData(actions))
      expect(result.current.getCountForTopoName('Germany')).toBe(1) // 0 specific + 1 all
    })

    it('returns 0 for unknown country with no "All" actions', () => {
      const actions = [makeAction('1', ['China'])]
      const { result } = renderHook(() => useMapData(actions))
      expect(result.current.getCountForTopoName('Germany')).toBe(0)
    })
  })

  describe('getActionsForCountry', () => {
    it('returns actions for a specific country', () => {
      const actions = [
        makeAction('1', ['China']),
        makeAction('2', ['Canada']),
        makeAction('3', ['China', 'India']),
      ]
      const { result } = renderHook(() => useMapData(actions))
      const chinaActions = result.current.getActionsForCountry('China')
      expect(chinaActions).toHaveLength(2)
      expect(chinaActions.map((a) => a.id)).toEqual(['1', '3'])
    })

    it('includes "All" actions in country results', () => {
      const actions = [
        makeAction('1', ['All']),
        makeAction('2', ['China']),
        makeAction('3', ['Canada']),
      ]
      const { result } = renderHook(() => useMapData(actions))
      const chinaActions = result.current.getActionsForCountry('China')
      expect(chinaActions).toHaveLength(2) // action 1 (All) + action 2 (China)
    })

    it('returns empty array for unknown country', () => {
      const actions = [makeAction('1', ['China'])]
      const { result } = renderHook(() => useMapData(actions))
      expect(result.current.getActionsForCountry('Atlantis')).toEqual([])
    })

    it('returns empty array for null/undefined country name', () => {
      const actions = [makeAction('1', ['China'])]
      const { result } = renderHook(() => useMapData(actions))
      expect(result.current.getActionsForCountry(null)).toEqual([])
      expect(result.current.getActionsForCountry(undefined)).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('handles actions with null countries_affected', () => {
      const actions = [{ id: '1', countries_affected: null }]
      const { result } = renderHook(() => useMapData(actions))
      expect(Object.keys(result.current.countryActionCounts)).toHaveLength(0)
      expect(result.current.allCountryCount).toBe(0)
    })

    it('handles actions with undefined countries_affected', () => {
      const actions = [{ id: '1' }]
      const { result } = renderHook(() => useMapData(actions))
      expect(Object.keys(result.current.countryActionCounts)).toHaveLength(0)
    })

    it('handles empty filteredActions array', () => {
      const { result } = renderHook(() => useMapData([]))
      expect(Object.keys(result.current.countryActionCounts)).toHaveLength(0)
      expect(result.current.allCountryCount).toBe(0)
      expect(result.current.maxCount).toBe(1)
      expect(result.current.getActionsForCountry('China')).toEqual([])
    })

    it('handles actions with empty countries_affected array', () => {
      const actions = [makeAction('1', [])]
      const { result } = renderHook(() => useMapData(actions))
      expect(Object.keys(result.current.countryActionCounts)).toHaveLength(0)
    })

    it('handles actions with both "All" and specific countries', () => {
      const actions = [makeAction('1', ['All', 'China'])]
      const { result } = renderHook(() => useMapData(actions))
      // "China" counted in specific, "All" counted in allCountryCount
      expect(result.current.countryActionCounts['China']).toBe(1)
      expect(result.current.allCountryCount).toBe(1)
      // getActionsForCountry should not duplicate
      const chinaActions = result.current.getActionsForCountry('China')
      expect(chinaActions).toHaveLength(1) // same action, included once
    })
  })
})
