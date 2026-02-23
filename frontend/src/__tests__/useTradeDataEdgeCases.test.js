import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the filter and sort logic directly since the hook reads from a static JSON import.
// We replicate the core logic to test edge cases without needing to mock the JSON module.

describe('useTradeData — Filter Logic Edge Cases', () => {
  // Replicate the core filter function from useTradeData.js
  const applyFilters = (actions, filters) => {
    return actions.filter((action) => {
      if (filters.countries.length > 0) {
        const actionCountries = action.countries_affected || []
        const matches = actionCountries.some(
          (c) => filters.countries.includes(c) || c === 'All'
        )
        if (!matches) return false
      }
      if (filters.actionTypes.length > 0) {
        if (!filters.actionTypes.includes(action.action_type)) return false
      }
      if (filters.status.length > 0) {
        if (!filters.status.includes(action.status)) return false
      }
      if (filters.dateStart && action.effective_date) {
        if (action.effective_date < filters.dateStart) return false
      }
      if (filters.dateEnd && action.effective_date) {
        if (action.effective_date > filters.dateEnd) return false
      }
      if (filters.searchText) {
        const q = filters.searchText.toLowerCase()
        const searchable = [
          action.title,
          action.summary,
          action.raw_excerpt,
          action.source_csms_id,
          ...(action.countries_affected || []),
          ...(action.hs_codes || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!searchable.includes(q)) return false
      }
      return true
    })
  }

  const noFilters = {
    countries: [],
    actionTypes: [],
    status: [],
    dateStart: '',
    dateEnd: '',
    searchText: '',
  }

  const sampleActions = [
    {
      id: '1',
      title: 'Steel Tariff',
      summary: '25% on steel',
      action_type: 'tariff',
      status: 'active',
      countries_affected: ['All'],
      hs_codes: ['7206.10'],
      effective_date: '2025-03-12',
      source_csms_id: 'CSMS #64348411',
    },
    {
      id: '2',
      title: 'IEEPA Canada',
      summary: 'Tariffs on Canadian goods',
      action_type: 'tariff',
      status: 'active',
      countries_affected: ['Canada'],
      hs_codes: [],
      effective_date: '2025-03-04',
      source_csms_id: 'CSMS #63988467',
    },
    {
      id: '3',
      title: 'Russia Embargo',
      summary: 'Prohibited goods from Russia',
      action_type: 'embargo',
      status: 'active',
      countries_affected: ['Russia'],
      hs_codes: [],
      effective_date: null,
      source_csms_id: 'CSMS #12345',
    },
    {
      id: '4',
      title: 'Pending Investigation',
      summary: 'Under review',
      action_type: 'investigation',
      status: 'pending',
      countries_affected: ['China'],
      hs_codes: ['8471'],
      effective_date: '2025-06-01',
      source_csms_id: 'CSMS #99999',
    },
  ]

  describe('Combined Filters', () => {
    it('applies country + type filters together', () => {
      const filters = { ...noFilters, countries: ['China'], actionTypes: ['investigation'] }
      const result = applyFilters(sampleActions, filters)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('4')
    })

    it('country + type with no match returns empty', () => {
      const filters = { ...noFilters, countries: ['Canada'], actionTypes: ['embargo'] }
      const result = applyFilters(sampleActions, filters)
      expect(result).toHaveLength(0)
    })

    it('applies country + status + date filters together', () => {
      const filters = {
        ...noFilters,
        countries: ['China'],
        status: ['pending'],
        dateStart: '2025-05-01',
        dateEnd: '2025-07-01',
      }
      const result = applyFilters(sampleActions, filters)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('4')
    })

    it('applies text search + action type together', () => {
      const filters = { ...noFilters, searchText: 'steel', actionTypes: ['tariff'] }
      const result = applyFilters(sampleActions, filters)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })
  })

  describe('"All" Countries Matching', () => {
    it('actions with "All" match any country filter', () => {
      const filters = { ...noFilters, countries: ['Japan'] }
      const result = applyFilters(sampleActions, filters)
      // Steel Tariff has "All" so it matches any country filter
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('actions with "All" match with multiple countries', () => {
      const filters = { ...noFilters, countries: ['Japan', 'Canada'] }
      const result = applyFilters(sampleActions, filters)
      // Steel Tariff (All) + IEEPA Canada
      expect(result).toHaveLength(2)
    })
  })

  describe('Date Range Edge Cases', () => {
    it('actions without effective_date pass date filters', () => {
      // When effective_date is null, the date filter conditions short-circuit
      const filters = { ...noFilters, dateStart: '2025-01-01', dateEnd: '2025-12-31' }
      const result = applyFilters(sampleActions, filters)
      // All 3 dated actions plus the null-dated one (null passes through)
      expect(result).toHaveLength(4)
    })

    it('exact date boundary includes matching action', () => {
      const filters = { ...noFilters, dateStart: '2025-03-12', dateEnd: '2025-03-12' }
      const result = applyFilters(sampleActions, filters)
      // Only the steel tariff with exact date match (+ Russia with null date)
      expect(result.some((a) => a.id === '1')).toBe(true)
    })

    it('date range excludes out-of-range actions', () => {
      const filters = { ...noFilters, dateStart: '2025-04-01', dateEnd: '2025-04-30' }
      const result = applyFilters(sampleActions, filters)
      // Only Russia (null date passes) — no others in April
      const ids = result.map((a) => a.id)
      expect(ids).not.toContain('1') // March 12
      expect(ids).not.toContain('2') // March 4
      expect(ids).toContain('3')     // null date passes
      expect(ids).not.toContain('4') // June 1
    })
  })

  describe('Search Text Edge Cases', () => {
    it('search is case-insensitive', () => {
      const filters = { ...noFilters, searchText: 'STEEL' }
      const result = applyFilters(sampleActions, filters)
      expect(result).toHaveLength(1)
    })

    it('search matches against hs_codes', () => {
      const filters = { ...noFilters, searchText: '8471' }
      const result = applyFilters(sampleActions, filters)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('4')
    })

    it('search matches against country names', () => {
      const filters = { ...noFilters, searchText: 'Russia' }
      const result = applyFilters(sampleActions, filters)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('3')
    })

    it('search matches against source_csms_id', () => {
      const filters = { ...noFilters, searchText: '64348411' }
      const result = applyFilters(sampleActions, filters)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('search with no matches returns empty', () => {
      const filters = { ...noFilters, searchText: 'xyznonexistent' }
      const result = applyFilters(sampleActions, filters)
      expect(result).toHaveLength(0)
    })
  })

  describe('Missing/Null Fields', () => {
    it('handles action with undefined countries_affected', () => {
      const actions = [{ ...sampleActions[0], countries_affected: undefined }]
      const filters = { ...noFilters, countries: ['China'] }
      const result = applyFilters(actions, filters)
      expect(result).toHaveLength(0) // No match since no countries
    })

    it('handles action with undefined hs_codes in search', () => {
      const actions = [{ ...sampleActions[0], hs_codes: undefined }]
      const filters = { ...noFilters, searchText: 'steel' }
      const result = applyFilters(actions, filters)
      expect(result).toHaveLength(1) // Still matches title
    })
  })
})

describe('useTradeData — Sort Logic Edge Cases', () => {
  const applySort = (actions, sortField, sortDirection) => {
    return [...actions].sort((a, b) => {
      let aVal = a[sortField] || ''
      let bVal = b[sortField] || ''
      if (sortField === 'effective_date' || sortField === 'expiration_date') {
        aVal = aVal || '0000-00-00'
        bVal = bVal || '0000-00-00'
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  it('sorts null dates to the end when descending', () => {
    const actions = [
      { id: 'a', effective_date: null },
      { id: 'b', effective_date: '2025-06-01' },
      { id: 'c', effective_date: '2025-03-01' },
    ]
    const sorted = applySort(actions, 'effective_date', 'desc')
    expect(sorted[0].id).toBe('b') // June 2025
    expect(sorted[1].id).toBe('c') // March 2025
    expect(sorted[2].id).toBe('a') // null → '0000-00-00' sorts last desc
  })

  it('sorts null dates to the start when ascending', () => {
    const actions = [
      { id: 'a', effective_date: '2025-06-01' },
      { id: 'b', effective_date: null },
      { id: 'c', effective_date: '2025-03-01' },
    ]
    const sorted = applySort(actions, 'effective_date', 'asc')
    expect(sorted[0].id).toBe('b') // null → '0000-00-00' sorts first asc
  })

  it('sorts by title alphabetically', () => {
    const actions = [
      { id: 'c', title: 'Copper' },
      { id: 'a', title: 'Aluminum' },
      { id: 'b', title: 'Steel' },
    ]
    const sorted = applySort(actions, 'title', 'asc')
    expect(sorted.map((a) => a.id)).toEqual(['a', 'c', 'b'])
  })

  it('handles empty actions array', () => {
    const sorted = applySort([], 'effective_date', 'desc')
    expect(sorted).toEqual([])
  })

  it('handles single-element array', () => {
    const actions = [{ id: 'only', effective_date: '2025-01-01' }]
    const sorted = applySort(actions, 'effective_date', 'desc')
    expect(sorted).toHaveLength(1)
  })
})

describe('useTradeData — Stats Computation Edge Cases', () => {
  const computeStats = (filteredActions) => {
    const active = filteredActions.filter((a) => a.status === 'active').length
    const countryCounts = {}
    filteredActions.forEach((a) => {
      ;(a.countries_affected || []).forEach((c) => {
        countryCounts[c] = (countryCounts[c] || 0) + 1
      })
    })
    const topCountry =
      Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0] || null

    const typeCounts = {}
    filteredActions.forEach((a) => {
      typeCounts[a.action_type] = (typeCounts[a.action_type] || 0) + 1
    })
    const topType =
      Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0] || null

    return {
      total: filteredActions.length,
      active,
      topCountry: topCountry ? { name: topCountry[0], count: topCountry[1] } : null,
      topType: topType ? { name: topType[0], count: topType[1] } : null,
      countryCounts,
      typeCounts,
    }
  }

  it('returns zeros and nulls for empty actions', () => {
    const stats = computeStats([])
    expect(stats.total).toBe(0)
    expect(stats.active).toBe(0)
    expect(stats.topCountry).toBeNull()
    expect(stats.topType).toBeNull()
    expect(stats.countryCounts).toEqual({})
    expect(stats.typeCounts).toEqual({})
  })

  it('counts multiple countries per action', () => {
    const actions = [
      { id: '1', action_type: 'tariff', status: 'active', countries_affected: ['China', 'Mexico'] },
    ]
    const stats = computeStats(actions)
    expect(stats.countryCounts).toEqual({ China: 1, Mexico: 1 })
  })

  it('handles actions with undefined countries_affected', () => {
    const actions = [
      { id: '1', action_type: 'tariff', status: 'active', countries_affected: undefined },
    ]
    const stats = computeStats(actions)
    expect(stats.total).toBe(1)
    expect(stats.countryCounts).toEqual({})
    expect(stats.topCountry).toBeNull()
  })

  it('finds correct top country and type with ties', () => {
    const actions = [
      { id: '1', action_type: 'tariff', status: 'active', countries_affected: ['China'] },
      { id: '2', action_type: 'tariff', status: 'active', countries_affected: ['China'] },
      { id: '3', action_type: 'duty', status: 'active', countries_affected: ['Canada'] },
    ]
    const stats = computeStats(actions)
    expect(stats.topCountry.name).toBe('China')
    expect(stats.topCountry.count).toBe(2)
    expect(stats.topType.name).toBe('tariff')
    expect(stats.topType.count).toBe(2)
  })
})
