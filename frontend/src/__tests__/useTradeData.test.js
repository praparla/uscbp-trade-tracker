import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTradeData } from '../hooks/useTradeData'

describe('useTradeData hook', () => {
  it('loads actions from the JSON file', () => {
    const { result } = renderHook(() => useTradeData())
    expect(result.current.allActions.length).toBeGreaterThan(0)
    expect(result.current.meta).toBeTruthy()
  })

  it('initially returns all actions unfiltered', () => {
    const { result } = renderHook(() => useTradeData())
    expect(result.current.filteredActions.length).toBe(result.current.allActions.length)
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('defaults to descending effective_date sort', () => {
    const { result } = renderHook(() => useTradeData())
    expect(result.current.sortField).toBe('effective_date')
    expect(result.current.sortDirection).toBe('desc')

    const dates = result.current.sortedActions
      .map((a) => a.effective_date)
      .filter(Boolean)
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] <= dates[i - 1]).toBe(true)
    }
  })

  it('computes stats correctly', () => {
    const { result } = renderHook(() => useTradeData())
    const { stats } = result.current

    expect(stats.total).toBe(result.current.filteredActions.length)
    expect(stats.active).toBeLessThanOrEqual(stats.total)
    expect(stats.topCountry).toBeTruthy()
    expect(stats.topType).toBeTruthy()
    expect(typeof stats.countryCounts).toBe('object')
    expect(typeof stats.typeCounts).toBe('object')
  })

  describe('filtering', () => {
    it('filters by action type', () => {
      const { result } = renderHook(() => useTradeData())

      act(() => {
        result.current.updateFilter('actionTypes', ['tariff'])
      })

      expect(result.current.hasActiveFilters).toBe(true)
      result.current.filteredActions.forEach((a) => {
        expect(a.action_type).toBe('tariff')
      })
      expect(result.current.filteredActions.length).toBeLessThan(
        result.current.allActions.length
      )
    })

    it('filters by country', () => {
      const { result } = renderHook(() => useTradeData())

      act(() => {
        result.current.updateFilter('countries', ['China'])
      })

      result.current.filteredActions.forEach((a) => {
        const hasCountry =
          a.countries_affected.includes('China') ||
          a.countries_affected.includes('All')
        expect(hasCountry).toBe(true)
      })
    })

    it('filters by text search', () => {
      const { result } = renderHook(() => useTradeData())

      act(() => {
        result.current.updateFilter('searchText', 'Section 232')
      })

      expect(result.current.filteredActions.length).toBeGreaterThan(0)
      result.current.filteredActions.forEach((a) => {
        const text = [a.title, a.summary, a.raw_excerpt].join(' ').toLowerCase()
        expect(text).toContain('section 232')
      })
    })

    it('filters by date range', () => {
      const { result } = renderHook(() => useTradeData())

      act(() => {
        result.current.updateFilter('dateStart', '2025-06-01')
        result.current.updateFilter('dateEnd', '2025-12-31')
      })

      result.current.filteredActions.forEach((a) => {
        if (a.effective_date) {
          expect(a.effective_date >= '2025-06-01').toBe(true)
          expect(a.effective_date <= '2025-12-31').toBe(true)
        }
      })
    })

    it('clearFilters resets everything', () => {
      const { result } = renderHook(() => useTradeData())

      act(() => {
        result.current.updateFilter('actionTypes', ['tariff'])
        result.current.updateFilter('searchText', 'steel')
      })
      expect(result.current.hasActiveFilters).toBe(true)

      act(() => {
        result.current.clearFilters()
      })

      expect(result.current.hasActiveFilters).toBe(false)
      expect(result.current.filteredActions.length).toBe(
        result.current.allActions.length
      )
    })

    it('multiple filters combine with AND logic', () => {
      const { result } = renderHook(() => useTradeData())
      const totalBefore = result.current.allActions.length

      act(() => {
        result.current.updateFilter('actionTypes', ['tariff'])
      })
      const afterType = result.current.filteredActions.length

      act(() => {
        result.current.updateFilter('countries', ['China'])
      })
      const afterBoth = result.current.filteredActions.length

      expect(afterType).toBeLessThanOrEqual(totalBefore)
      expect(afterBoth).toBeLessThanOrEqual(afterType)
    })
  })

  describe('sorting', () => {
    it('toggles sort direction on same field', () => {
      const { result } = renderHook(() => useTradeData())
      expect(result.current.sortDirection).toBe('desc')

      act(() => {
        result.current.handleSort('effective_date')
      })
      expect(result.current.sortDirection).toBe('asc')

      act(() => {
        result.current.handleSort('effective_date')
      })
      expect(result.current.sortDirection).toBe('desc')
    })

    it('switches to new field with desc default', () => {
      const { result } = renderHook(() => useTradeData())

      act(() => {
        result.current.handleSort('title')
      })
      expect(result.current.sortField).toBe('title')
      expect(result.current.sortDirection).toBe('desc')
    })

    it('sorts by title alphabetically', () => {
      const { result } = renderHook(() => useTradeData())

      // First click: switch to title, desc
      act(() => { result.current.handleSort('title') })
      // Second click: toggle to asc
      act(() => { result.current.handleSort('title') })

      expect(result.current.sortField).toBe('title')
      expect(result.current.sortDirection).toBe('asc')

      const titles = result.current.sortedActions.map((a) => a.title)
      for (let i = 1; i < titles.length; i++) {
        expect(titles[i] >= titles[i - 1]).toBe(true)
      }
    })
  })
})
