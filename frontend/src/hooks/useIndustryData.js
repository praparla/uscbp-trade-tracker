import { useMemo } from 'react'
import {
  INDUSTRY_SECTORS,
  INDUSTRY_ESTIMATES,
  getIndustriesForAction,
} from '../industryMap'

/**
 * Parses an array of duty_rate strings and returns a human-readable range.
 * e.g., ["25%", "10-25%", "50%"] → "10%-50%"
 *       ["25%"] → "25%"
 *       ["Prohibited"] → "Varies"
 *       [] → "N/A"
 */
export function computeDutyRateRange(rates) {
  if (rates.length === 0) return 'N/A'

  const nums = []
  for (const r of rates) {
    // Match "25%", "10-25%", "25% (general); 10% (energy)" patterns
    // First try explicit percentage matches
    const pctMatches = r.match(/(\d+(?:\.\d+)?)%/g)
    if (pctMatches) {
      pctMatches.forEach((m) => nums.push(parseFloat(m)))
    }
    // Also match dash-range like "10-25%" where the first number lacks %
    const rangeMatch = r.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)%/)
    if (rangeMatch) {
      nums.push(parseFloat(rangeMatch[1]))
    }
  }

  if (nums.length === 0) return 'Varies'

  const min = Math.min(...nums)
  const max = Math.max(...nums)
  if (min === max) return `${min}%`
  return `${min}%-${max}%`
}

/**
 * Extracts the highest numeric rate from an array of duty_rate strings.
 * Returns null if no numeric rate found.
 */
export function parseMaxRate(rates) {
  let max = null
  for (const r of rates) {
    const matches = r.match(/(\d+(?:\.\d+)?)%/g)
    if (matches) {
      for (const m of matches) {
        const num = parseFloat(m)
        if (max === null || num > max) max = num
      }
    }
  }
  return max
}

/**
 * Counts unique HS codes across an array of trade actions.
 */
export function countUniqueHsCodes(actions) {
  const codes = new Set()
  for (const action of actions) {
    if (Array.isArray(action.hs_codes)) {
      action.hs_codes.forEach((code) => codes.add(code))
    }
  }
  return codes.size
}

/**
 * Hook that processes filteredActions into industry-sector aggregates.
 *
 * Returns:
 *   sectors       — enriched sector objects with stats, actions, and estimates
 *   chartData     — pre-shaped for recharts bar chart (action counts)
 *   rateChartData — pre-shaped for recharts bar chart (max tariff rates)
 *   totalIndustries     — number of non-empty sectors
 *   totalMappedActions  — sum of actions across sectors (may exceed filteredActions.length)
 */
export function useIndustryData(filteredActions) {
  const sectors = useMemo(() => {
    // Bucket actions into sectors
    const buckets = {}
    for (const sector of INDUSTRY_SECTORS) {
      buckets[sector.id] = []
    }

    for (const action of filteredActions) {
      const sectorIds = getIndustriesForAction(action)
      for (const sid of sectorIds) {
        if (buckets[sid]) {
          buckets[sid].push(action)
        }
      }
    }

    // Compute per-sector aggregates
    return INDUSTRY_SECTORS.map((sector) => {
      const actions = buckets[sector.id]
      const activeCount = actions.filter((a) => a.status === 'active').length

      // Unique countries
      const countrySet = new Set()
      actions.forEach((a) =>
        (a.countries_affected || []).forEach((c) => countrySet.add(c))
      )

      // Duty rate range
      const rates = actions.map((a) => a.duty_rate).filter(Boolean)
      const dutyRateRange = computeDutyRateRange(rates)
      const maxRate = parseMaxRate(rates)

      // Date range
      const dates = actions.map((a) => a.effective_date).filter(Boolean).sort()

      // Status breakdown
      const statusBreakdown = { active: 0, superseded: 0, expired: 0, pending: 0 }
      actions.forEach((a) => {
        if (statusBreakdown[a.status] !== undefined) {
          statusBreakdown[a.status]++
        }
      })

      // HS code count
      const hsCodeCount = countUniqueHsCodes(actions)

      // Estimates
      const estimates = INDUSTRY_ESTIMATES[sector.id] || {
        verified: [],
        external: [],
        keyMetric: '',
      }

      return {
        ...sector,
        actionCount: actions.length,
        activeCount,
        actions,
        countries: [...countrySet].sort(),
        dutyRateRange,
        maxRate,
        dateRange: {
          earliest: dates[0] || null,
          latest: dates[dates.length - 1] || null,
        },
        statusBreakdown,
        hsCodeCount,
        estimates,
      }
    }).filter((s) => s.actionCount > 0)
  }, [filteredActions])

  const chartData = useMemo(() => {
    return sectors.map((s) => ({
      sector: s.label,
      sectorId: s.id,
      actions: s.actionCount,
      active: s.activeCount,
      color: s.color,
    }))
  }, [sectors])

  const rateChartData = useMemo(() => {
    return sectors
      .filter((s) => s.maxRate !== null)
      .map((s) => ({
        sector: s.label,
        sectorId: s.id,
        maxRate: s.maxRate,
        color: s.color,
      }))
  }, [sectors])

  const totalMappedActions = useMemo(
    () => sectors.reduce((sum, s) => sum + s.actionCount, 0),
    [sectors]
  )

  return {
    sectors,
    chartData,
    rateChartData,
    totalIndustries: sectors.length,
    totalMappedActions,
  }
}
