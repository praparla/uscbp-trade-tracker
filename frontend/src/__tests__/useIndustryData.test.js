import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIndustryData, computeDutyRateRange, parseMaxRate, countUniqueHsCodes } from '../hooks/useIndustryData'

// Matches known action IDs from ACTION_INDUSTRY_MAP
function makeAction(id, overrides = {}) {
  return {
    id,
    title: `Action ${id}`,
    summary: '',
    action_type: 'tariff',
    countries_affected: ['All'],
    hs_codes: [],
    effective_date: '2025-06-01',
    expiration_date: null,
    status: 'active',
    duty_rate: '25%',
    federal_authority: 'Section 232',
    ...overrides,
  }
}

// ─── Helper Functions ────────────────────────────────────────────────

describe('computeDutyRateRange', () => {
  it('returns N/A for empty array', () => {
    expect(computeDutyRateRange([])).toBe('N/A')
  })

  it('returns single rate for one value', () => {
    expect(computeDutyRateRange(['25%'])).toBe('25%')
  })

  it('returns range for multiple values', () => {
    expect(computeDutyRateRange(['25%', '50%'])).toBe('25%-50%')
  })

  it('parses compound rates like "10-25%"', () => {
    expect(computeDutyRateRange(['10-25%'])).toBe('10%-25%')
  })

  it('returns Varies for non-numeric rates', () => {
    expect(computeDutyRateRange(['Prohibited'])).toBe('Varies')
    expect(computeDutyRateRange(['TRQ'])).toBe('Varies')
  })

  it('ignores non-numeric and includes numeric', () => {
    expect(computeDutyRateRange(['Prohibited', '25%'])).toBe('25%')
  })

  it('handles complex rate strings', () => {
    expect(computeDutyRateRange(['25% (general); 10% (energy)'])).toBe('10%-25%')
  })
})

describe('parseMaxRate', () => {
  it('returns null for empty array', () => {
    expect(parseMaxRate([])).toBeNull()
  })

  it('returns max numeric rate', () => {
    expect(parseMaxRate(['25%', '50%'])).toBe(50)
  })

  it('parses rates from compound strings', () => {
    expect(parseMaxRate(['10-25%', '35%'])).toBe(35)
  })

  it('returns null for non-numeric rates', () => {
    expect(parseMaxRate(['Prohibited', 'TRQ'])).toBeNull()
  })
})

describe('countUniqueHsCodes', () => {
  it('returns 0 for empty actions', () => {
    expect(countUniqueHsCodes([])).toBe(0)
  })

  it('counts unique codes across actions', () => {
    const actions = [
      { hs_codes: ['9903.81.89', '9903.81.90'] },
      { hs_codes: ['9903.81.89', '9903.85.04'] },
    ]
    expect(countUniqueHsCodes(actions)).toBe(3)
  })

  it('handles actions with no hs_codes', () => {
    const actions = [
      { hs_codes: [] },
      { hs_codes: ['9903.81.89'] },
    ]
    expect(countUniqueHsCodes(actions)).toBe(1)
  })

  it('handles missing hs_codes field', () => {
    const actions = [{ title: 'no codes' }]
    expect(countUniqueHsCodes(actions)).toBe(0)
  })
})

// ─── useIndustryData Hook ────────────────────────────────────────────

describe('useIndustryData', () => {
  describe('sectors', () => {
    it('groups actions by industry sector', () => {
      const actions = [
        makeAction('csms-64348411-s232-steel'),
        makeAction('csms-64348288-s232-aluminum'),
        makeAction('csms-64624801-s232-autos'),
      ]
      const { result } = renderHook(() => useIndustryData(actions))
      const metals = result.current.sectors.find((s) => s.id === 'primary-metals')
      const auto = result.current.sectors.find((s) => s.id === 'automotive')
      expect(metals.actionCount).toBe(2)
      expect(auto.actionCount).toBe(1)
    })

    it('computes correct activeCount', () => {
      const actions = [
        makeAction('csms-64348411-s232-steel', { status: 'active' }),
        makeAction('csms-65441222-s232-steel-deriv', { status: 'superseded' }),
      ]
      const { result } = renderHook(() => useIndustryData(actions))
      const metals = result.current.sectors.find((s) => s.id === 'primary-metals')
      expect(metals.activeCount).toBe(1)
    })

    it('includes actions in the actions array', () => {
      const actions = [makeAction('csms-64624801-s232-autos')]
      const { result } = renderHook(() => useIndustryData(actions))
      const auto = result.current.sectors.find((s) => s.id === 'automotive')
      expect(auto.actions).toHaveLength(1)
      expect(auto.actions[0].id).toBe('csms-64624801-s232-autos')
    })

    it('deduplicates countries per sector', () => {
      const actions = [
        makeAction('csms-64348411-s232-steel', { countries_affected: ['China', 'Canada'] }),
        makeAction('csms-64348288-s232-aluminum', { countries_affected: ['China', 'Mexico'] }),
      ]
      const { result } = renderHook(() => useIndustryData(actions))
      const metals = result.current.sectors.find((s) => s.id === 'primary-metals')
      expect(metals.countries).toEqual(['Canada', 'China', 'Mexico'])
    })

    it('computes dutyRateRange for single rate', () => {
      const actions = [
        makeAction('csms-64348411-s232-steel', { duty_rate: '25%' }),
        makeAction('csms-64348288-s232-aluminum', { duty_rate: '25%' }),
      ]
      const { result } = renderHook(() => useIndustryData(actions))
      const metals = result.current.sectors.find((s) => s.id === 'primary-metals')
      expect(metals.dutyRateRange).toBe('25%')
    })

    it('computes dutyRateRange for range', () => {
      const actions = [
        makeAction('csms-64348411-s232-steel', { duty_rate: '25%' }),
        makeAction('csms-65794272-s232-copper', { duty_rate: '50%' }),
      ]
      const { result } = renderHook(() => useIndustryData(actions))
      const metals = result.current.sectors.find((s) => s.id === 'primary-metals')
      expect(metals.dutyRateRange).toBe('25%-50%')
    })

    it('computes dateRange (earliest/latest)', () => {
      const actions = [
        makeAction('csms-64348411-s232-steel', { effective_date: '2025-03-12' }),
        makeAction('csms-65794272-s232-copper', { effective_date: '2025-08-01' }),
      ]
      const { result } = renderHook(() => useIndustryData(actions))
      const metals = result.current.sectors.find((s) => s.id === 'primary-metals')
      expect(metals.dateRange.earliest).toBe('2025-03-12')
      expect(metals.dateRange.latest).toBe('2025-08-01')
    })

    it('computes statusBreakdown', () => {
      const actions = [
        makeAction('csms-64348411-s232-steel', { status: 'active' }),
        makeAction('csms-65441222-s232-steel-deriv', { status: 'superseded' }),
        makeAction('csms-64348288-s232-aluminum', { status: 'active' }),
      ]
      const { result } = renderHook(() => useIndustryData(actions))
      const metals = result.current.sectors.find((s) => s.id === 'primary-metals')
      expect(metals.statusBreakdown.active).toBe(2)
      expect(metals.statusBreakdown.superseded).toBe(1)
    })

    it('omits sectors with zero actions', () => {
      const actions = [makeAction('csms-64348411-s232-steel')]
      const { result } = renderHook(() => useIndustryData(actions))
      const sectorIds = result.current.sectors.map((s) => s.id)
      expect(sectorIds).toContain('primary-metals')
      expect(sectorIds).not.toContain('automotive')
    })

    it('handles multi-industry actions (appears in multiple sectors)', () => {
      const actions = [
        makeAction('csms-63577329-s301-4yr-review'),
      ]
      const { result } = renderHook(() => useIndustryData(actions))
      const semi = result.current.sectors.find((s) => s.id === 'semiconductors')
      const consumer = result.current.sectors.find((s) => s.id === 'consumer-goods')
      expect(semi.actionCount).toBe(1)
      expect(consumer.actionCount).toBe(1)
    })

    it('attaches estimates from INDUSTRY_ESTIMATES', () => {
      const actions = [makeAction('csms-64348411-s232-steel')]
      const { result } = renderHook(() => useIndustryData(actions))
      const metals = result.current.sectors.find((s) => s.id === 'primary-metals')
      expect(metals.estimates.keyMetric).toBeTruthy()
      expect(Array.isArray(metals.estimates.verified)).toBe(true)
    })

    it('computes hsCodeCount from actions', () => {
      const actions = [
        makeAction('csms-64348411-s232-steel', {
          hs_codes: ['9903.81.89', '9903.81.90'],
        }),
        makeAction('csms-64348288-s232-aluminum', {
          hs_codes: ['9903.85.04', '9903.81.89'],
        }),
      ]
      const { result } = renderHook(() => useIndustryData(actions))
      const metals = result.current.sectors.find((s) => s.id === 'primary-metals')
      expect(metals.hsCodeCount).toBe(3)
    })
  })

  describe('chartData', () => {
    it('has one entry per non-empty sector', () => {
      const actions = [
        makeAction('csms-64348411-s232-steel'),
        makeAction('csms-64624801-s232-autos'),
      ]
      const { result } = renderHook(() => useIndustryData(actions))
      expect(result.current.chartData).toHaveLength(2)
    })

    it('includes sector label, actions count, active count, color', () => {
      const actions = [makeAction('csms-64348411-s232-steel')]
      const { result } = renderHook(() => useIndustryData(actions))
      const entry = result.current.chartData.find((d) => d.sectorId === 'primary-metals')
      expect(entry.sector).toBe('Primary Metals')
      expect(entry.actions).toBe(1)
      expect(entry.active).toBe(1)
      expect(entry.color).toBe('#6366f1')
    })
  })

  describe('rateChartData', () => {
    it('excludes sectors with no numeric rate', () => {
      const actions = [
        makeAction('csms-sanctions-russia', { duty_rate: 'Prohibited' }),
      ]
      const { result } = renderHook(() => useIndustryData(actions))
      const luxEntry = result.current.rateChartData.find((d) => d.sectorId === 'luxury-goods')
      expect(luxEntry).toBeUndefined()
    })

    it('includes max rate for sectors with numeric rates', () => {
      const actions = [
        makeAction('csms-64348411-s232-steel', { duty_rate: '25%' }),
        makeAction('csms-65794272-s232-copper', { duty_rate: '50%' }),
      ]
      const { result } = renderHook(() => useIndustryData(actions))
      const entry = result.current.rateChartData.find((d) => d.sectorId === 'primary-metals')
      expect(entry.maxRate).toBe(50)
    })
  })

  describe('edge cases', () => {
    it('handles empty filteredActions', () => {
      const { result } = renderHook(() => useIndustryData([]))
      expect(result.current.sectors).toHaveLength(0)
      expect(result.current.chartData).toHaveLength(0)
      expect(result.current.totalIndustries).toBe(0)
      expect(result.current.totalMappedActions).toBe(0)
    })

    it('handles actions with null/missing fields', () => {
      const actions = [
        makeAction('csms-64348411-s232-steel', {
          duty_rate: null,
          countries_affected: null,
          hs_codes: null,
          effective_date: null,
        }),
      ]
      const { result } = renderHook(() => useIndustryData(actions))
      const metals = result.current.sectors.find((s) => s.id === 'primary-metals')
      expect(metals.actionCount).toBe(1)
      expect(metals.dutyRateRange).toBe('N/A')
      expect(metals.countries).toEqual([])
      expect(metals.hsCodeCount).toBe(0)
      expect(metals.dateRange.earliest).toBeNull()
    })

    it('totalMappedActions may exceed filteredActions.length with multi-mapping', () => {
      const actions = [
        makeAction('csms-63577329-s301-4yr-review'),
      ]
      const { result } = renderHook(() => useIndustryData(actions))
      // This action maps to both semiconductors and consumer-goods
      expect(result.current.totalMappedActions).toBe(2)
    })
  })
})

// ─── Additional computeDutyRateRange Edge Cases ───────────────────────

describe('computeDutyRateRange (additional)', () => {
  it('handles decimal rates like 7.5%', () => {
    expect(computeDutyRateRange(['7.5%'])).toBe('7.5%')
  })

  it('handles mixed decimal and integer rates', () => {
    expect(computeDutyRateRange(['7.5%', '25%'])).toBe('7.5%-25%')
  })

  it('handles multiple identical rates', () => {
    expect(computeDutyRateRange(['25%', '25%', '25%'])).toBe('25%')
  })

  it('handles complex rate with semicolons', () => {
    const result = computeDutyRateRange(['25% (general); 10% (energy); 50% (copper)'])
    expect(result).toBe('10%-50%')
  })
})

// ─── Additional parseMaxRate Edge Cases ───────────────────────────────

describe('parseMaxRate (additional)', () => {
  it('extracts max from dash-range "10-25%" → 25', () => {
    expect(parseMaxRate(['10-25%'])).toBe(25)
  })

  it('handles decimal rates', () => {
    expect(parseMaxRate(['7.5%', '12.5%'])).toBe(12.5)
  })

  it('handles single rate', () => {
    expect(parseMaxRate(['50%'])).toBe(50)
  })
})
