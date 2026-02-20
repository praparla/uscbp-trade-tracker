import { useState, useMemo, useCallback } from 'react'
import tradeData from '../data/trade_actions.json'

const initialFilters = {
  countries: [],
  actionTypes: [],
  dateStart: '',
  dateEnd: '',
  searchText: '',
  status: [],
}

export function useTradeData() {
  const [filters, setFilters] = useState(initialFilters)
  const [sortField, setSortField] = useState('effective_date')
  const [sortDirection, setSortDirection] = useState('desc')

  const meta = tradeData.meta || {}
  const allActions = tradeData.actions || []

  // Derive filter options from the data
  const filterOptions = useMemo(() => {
    const countries = new Set()
    const actionTypes = new Set()
    const statuses = new Set()

    allActions.forEach((a) => {
      a.countries_affected?.forEach((c) => countries.add(c))
      if (a.action_type) actionTypes.add(a.action_type)
      if (a.status) statuses.add(a.status)
    })

    return {
      countries: [...countries].sort(),
      actionTypes: [...actionTypes].sort(),
      statuses: [...statuses].sort(),
    }
  }, [allActions])

  // Apply filters
  const filteredActions = useMemo(() => {
    return allActions.filter((action) => {
      // Country filter
      if (filters.countries.length > 0) {
        const actionCountries = action.countries_affected || []
        const matches = actionCountries.some(
          (c) => filters.countries.includes(c) || c === 'All'
        )
        if (!matches) return false
      }

      // Action type filter
      if (filters.actionTypes.length > 0) {
        if (!filters.actionTypes.includes(action.action_type)) return false
      }

      // Status filter
      if (filters.status.length > 0) {
        if (!filters.status.includes(action.status)) return false
      }

      // Date range filter
      if (filters.dateStart && action.effective_date) {
        if (action.effective_date < filters.dateStart) return false
      }
      if (filters.dateEnd && action.effective_date) {
        if (action.effective_date > filters.dateEnd) return false
      }

      // Text search
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
  }, [allActions, filters])

  // Sort
  const sortedActions = useMemo(() => {
    const sorted = [...filteredActions].sort((a, b) => {
      let aVal = a[sortField] || ''
      let bVal = b[sortField] || ''

      // Handle date sorting
      if (sortField === 'effective_date' || sortField === 'expiration_date') {
        aVal = aVal || '0000-00-00'
        bVal = bVal || '0000-00-00'
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [filteredActions, sortField, sortDirection])

  const handleSort = useCallback(
    (field) => {
      if (field === sortField) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDirection('desc')
      }
    },
    [sortField]
  )

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(initialFilters)
  }, [])

  const hasActiveFilters = useMemo(() => {
    return (
      filters.countries.length > 0 ||
      filters.actionTypes.length > 0 ||
      filters.status.length > 0 ||
      filters.dateStart !== '' ||
      filters.dateEnd !== '' ||
      filters.searchText !== ''
    )
  }, [filters])

  // Stats for summary cards
  const stats = useMemo(() => {
    const active = filteredActions.filter((a) => a.status === 'active').length

    // Most affected country
    const countryCounts = {}
    filteredActions.forEach((a) => {
      ;(a.countries_affected || []).forEach((c) => {
        countryCounts[c] = (countryCounts[c] || 0) + 1
      })
    })
    const topCountry =
      Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0] || null

    // Most common type
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
  }, [filteredActions])

  return {
    meta,
    allActions,
    filteredActions,
    sortedActions,
    filters,
    filterOptions,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    sortField,
    sortDirection,
    handleSort,
    stats,
  }
}
