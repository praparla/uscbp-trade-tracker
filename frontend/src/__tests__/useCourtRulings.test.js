import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock data — we control it per test
let mockData = { meta: {}, rulings: [] }
vi.mock('../data/court_rulings.json', () => {
  return { default: new Proxy({}, { get: (_, prop) => mockData[prop] }) }
})

// Import after mock
const { useCourtRulings } = await import('../hooks/useCourtRulings')

function makeRuling(id, overrides = {}) {
  return {
    id,
    case_name: `Case ${id}`,
    case_number: `25-${id}`,
    court: 'U.S. Court of International Trade',
    ruling_type: 'lawsuit',
    status: 'pending',
    filing_date: '2025-06-01',
    argument_date: null,
    ruling_date: null,
    summary: `Summary for ${id}`,
    outcome: null,
    affected_tariff_programs: ['IEEPA'],
    affected_countries: ['Canada'],
    plaintiff: 'Plaintiff Corp',
    defendant: 'United States',
    source_url: 'https://www.cit.uscourts.gov/test',
    source_name: 'CIT',
    related_action_ids: [],
    key_legal_question: 'Test question',
    timeline_events: [
      { date: '2025-06-01', event: 'Filed', type: 'filing' },
    ],
    ...overrides,
  }
}

describe('useCourtRulings', () => {
  beforeEach(() => {
    mockData = { meta: {}, rulings: [] }
  })

  // ─── Empty state ─────────────────────────────────────────

  it('returns empty arrays and zero stats for empty data', () => {
    mockData = { meta: { total_rulings: 0 }, rulings: [] }
    const { result } = renderHook(() => useCourtRulings())
    expect(result.current.allRulings).toEqual([])
    expect(result.current.filteredRulings).toEqual([])
    expect(result.current.sortedRulings).toEqual([])
    expect(result.current.stats.total).toBe(0)
    expect(result.current.stats.pending).toBe(0)
    expect(result.current.stats.decided).toBe(0)
    expect(result.current.stats.programsChallenged).toBe(0)
    expect(result.current.timelineEvents).toEqual([])
    expect(result.current.challengedActionIds.size).toBe(0)
  })

  // ─── Basic data loading ──────────────────────────────────

  it('loads all rulings from data', () => {
    mockData = {
      meta: { total_rulings: 2 },
      rulings: [makeRuling('r1'), makeRuling('r2')],
    }
    const { result } = renderHook(() => useCourtRulings())
    expect(result.current.allRulings).toHaveLength(2)
    expect(result.current.filteredRulings).toHaveLength(2)
  })

  it('returns meta from data', () => {
    mockData = { meta: { total_rulings: 5, sources: ['cit.uscourts.gov'] }, rulings: [] }
    const { result } = renderHook(() => useCourtRulings())
    expect(result.current.meta.total_rulings).toBe(5)
    expect(result.current.meta.sources).toContain('cit.uscourts.gov')
  })

  // ─── Sorting ─────────────────────────────────────────────

  it('sorts rulings by ruling_date desc, then filing_date desc', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('old', { filing_date: '2025-01-01', ruling_date: null }),
        makeRuling('new', { filing_date: '2025-03-01', ruling_date: '2025-09-01' }),
        makeRuling('mid', { filing_date: '2025-06-01', ruling_date: null }),
      ],
    }
    const { result } = renderHook(() => useCourtRulings())
    expect(result.current.sortedRulings.map((r) => r.id)).toEqual(['new', 'mid', 'old'])
  })

  // ─── Country filter ──────────────────────────────────────

  it('filters by country', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('r1', { affected_countries: ['Canada'] }),
        makeRuling('r2', { affected_countries: ['China'] }),
        makeRuling('r3', { affected_countries: ['Canada', 'Mexico'] }),
      ],
    }
    const { result } = renderHook(() => useCourtRulings({ countries: ['Canada'] }))
    expect(result.current.filteredRulings).toHaveLength(2)
    expect(result.current.filteredRulings.map((r) => r.id).sort()).toEqual(['r1', 'r3'])
  })

  it('includes rulings with affected_countries "All" when filtering by country', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('r1', { affected_countries: ['All'] }),
        makeRuling('r2', { affected_countries: ['China'] }),
      ],
    }
    const { result } = renderHook(() => useCourtRulings({ countries: ['Canada'] }))
    expect(result.current.filteredRulings).toHaveLength(1)
    expect(result.current.filteredRulings[0].id).toBe('r1')
  })

  it('returns all rulings when countries filter is empty', () => {
    mockData = {
      meta: {},
      rulings: [makeRuling('r1'), makeRuling('r2')],
    }
    const { result } = renderHook(() => useCourtRulings({ countries: [] }))
    expect(result.current.filteredRulings).toHaveLength(2)
  })

  // ─── Date filter ─────────────────────────────────────────

  it('filters by date range on filing_date', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('r1', { filing_date: '2025-03-01' }),
        makeRuling('r2', { filing_date: '2025-06-01' }),
        makeRuling('r3', { filing_date: '2025-09-01' }),
      ],
    }
    const { result } = renderHook(() =>
      useCourtRulings({ dateStart: '2025-04-01', dateEnd: '2025-08-01' })
    )
    expect(result.current.filteredRulings).toHaveLength(1)
    expect(result.current.filteredRulings[0].id).toBe('r2')
  })

  it('handles rulings with null filing_date in date filter', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('r1', { filing_date: null }),
        makeRuling('r2', { filing_date: '2025-06-01' }),
      ],
    }
    const { result } = renderHook(() =>
      useCourtRulings({ dateStart: '2025-01-01' })
    )
    // null filing_date => falsy empty string, doesn't pass date comparison
    expect(result.current.filteredRulings).toHaveLength(1)
    expect(result.current.filteredRulings[0].id).toBe('r2')
  })

  // ─── Text search ─────────────────────────────────────────

  it('filters by search text matching case_name', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('r1', { case_name: 'V.O.S. Selections v. United States' }),
        makeRuling('r2', { case_name: 'Learning Resources v. Trump' }),
      ],
    }
    const { result } = renderHook(() => useCourtRulings({ search: 'learning' }))
    expect(result.current.filteredRulings).toHaveLength(1)
    expect(result.current.filteredRulings[0].id).toBe('r2')
  })

  it('filters by search text matching summary', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('r1', { summary: 'IEEPA tariff authority challenge' }),
        makeRuling('r2', { summary: 'Section 232 steel duties' }),
      ],
    }
    const { result } = renderHook(() => useCourtRulings({ search: 'steel' }))
    expect(result.current.filteredRulings).toHaveLength(1)
    expect(result.current.filteredRulings[0].id).toBe('r2')
  })

  it('filters by search text matching affected_tariff_programs', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('r1', { affected_tariff_programs: ['IEEPA'] }),
        makeRuling('r2', { affected_tariff_programs: ['Section 301'] }),
      ],
    }
    const { result } = renderHook(() => useCourtRulings({ search: '301' }))
    expect(result.current.filteredRulings).toHaveLength(1)
    expect(result.current.filteredRulings[0].id).toBe('r2')
  })

  it('filters by search text matching case_number', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('r1', { case_number: '25-00066' }),
        makeRuling('r2', { case_number: '24-1287' }),
      ],
    }
    const { result } = renderHook(() => useCourtRulings({ search: '1287' }))
    expect(result.current.filteredRulings).toHaveLength(1)
    expect(result.current.filteredRulings[0].id).toBe('r2')
  })

  // ─── Combined filters ───────────────────────────────────

  it('applies country + date + search filters simultaneously', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('r1', {
          affected_countries: ['Canada'],
          filing_date: '2025-06-01',
          case_name: 'IEEPA Challenge',
        }),
        makeRuling('r2', {
          affected_countries: ['China'],
          filing_date: '2025-06-01',
          case_name: 'IEEPA Challenge',
        }),
        makeRuling('r3', {
          affected_countries: ['Canada'],
          filing_date: '2025-01-01',
          case_name: 'IEEPA Challenge',
        }),
        makeRuling('r4', {
          affected_countries: ['Canada'],
          filing_date: '2025-06-01',
          case_name: 'Steel Dispute',
          affected_tariff_programs: ['Section 232'],
          summary: 'Section 232 steel tariff challenge',
          key_legal_question: 'Section 232 authority',
        }),
      ],
    }
    const { result } = renderHook(() =>
      useCourtRulings({ countries: ['Canada'], dateStart: '2025-04-01', search: 'ieepa' })
    )
    expect(result.current.filteredRulings).toHaveLength(1)
    expect(result.current.filteredRulings[0].id).toBe('r1')
  })

  // ─── Stats computation ──────────────────────────────────

  it('computes correct stats', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('r1', { status: 'pending', court: 'CIT', affected_tariff_programs: ['IEEPA'] }),
        makeRuling('r2', { status: 'decided', court: 'CIT', affected_tariff_programs: ['IEEPA'] }),
        makeRuling('r3', { status: 'enacted', court: 'Congress', affected_tariff_programs: ['Section 301'] }),
        makeRuling('r4', { status: 'dismissed', court: 'CIT', affected_tariff_programs: ['IEEPA'] }),
        makeRuling('r5', { status: 'pending', court: 'SCOTUS', affected_tariff_programs: ['Section 122'] }),
      ],
    }
    const { result } = renderHook(() => useCourtRulings())
    expect(result.current.stats.total).toBe(5)
    expect(result.current.stats.pending).toBe(2)
    expect(result.current.stats.decided).toBe(3) // decided + enacted + dismissed
    expect(result.current.stats.programsChallenged).toBe(3)
    expect(result.current.stats.byCourt).toEqual({ CIT: 3, Congress: 1, SCOTUS: 1 })
    expect(result.current.stats.byProgram).toEqual({ IEEPA: 3, 'Section 301': 1, 'Section 122': 1 })
  })

  it('returns zero stats when all filtered out', () => {
    mockData = {
      meta: {},
      rulings: [makeRuling('r1', { affected_countries: ['China'] })],
    }
    const { result } = renderHook(() => useCourtRulings({ countries: ['Canada'] }))
    expect(result.current.stats.total).toBe(0)
    expect(result.current.stats.pending).toBe(0)
    expect(result.current.stats.decided).toBe(0)
  })

  // ─── Timeline events ────────────────────────────────────

  it('flattens and sorts timeline events from all rulings', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('r1', {
          ruling_type: 'lawsuit',
          timeline_events: [
            { date: '2025-06-01', event: 'Filed', type: 'filing' },
            { date: '2025-09-01', event: 'Argued', type: 'argument' },
          ],
        }),
        makeRuling('r2', {
          ruling_type: 'ruling',
          timeline_events: [
            { date: '2025-07-01', event: 'Decided', type: 'ruling' },
          ],
        }),
      ],
    }
    const { result } = renderHook(() => useCourtRulings())
    expect(result.current.timelineEvents).toHaveLength(3)
    // Should be sorted chronologically
    expect(result.current.timelineEvents[0].date).toBe('2025-06-01')
    expect(result.current.timelineEvents[1].date).toBe('2025-07-01')
    expect(result.current.timelineEvents[2].date).toBe('2025-09-01')
    // Should have ruling metadata
    expect(result.current.timelineEvents[0].rulingId).toBe('r1')
    expect(result.current.timelineEvents[1].rulingId).toBe('r2')
  })

  it('returns empty timeline events for empty rulings', () => {
    mockData = { meta: {}, rulings: [] }
    const { result } = renderHook(() => useCourtRulings())
    expect(result.current.timelineEvents).toEqual([])
  })

  it('handles rulings with no timeline_events', () => {
    mockData = {
      meta: {},
      rulings: [makeRuling('r1', { timeline_events: [] })],
    }
    const { result } = renderHook(() => useCourtRulings())
    expect(result.current.timelineEvents).toEqual([])
  })

  it('handles rulings with null timeline_events', () => {
    mockData = {
      meta: {},
      rulings: [makeRuling('r1', { timeline_events: null })],
    }
    const { result } = renderHook(() => useCourtRulings())
    expect(result.current.timelineEvents).toEqual([])
  })

  // ─── Challenged action IDs ──────────────────────────────

  it('returns challenged action IDs from pending rulings only', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('r1', {
          status: 'pending',
          related_action_ids: ['action-1', 'action-2'],
        }),
        makeRuling('r2', {
          status: 'decided',
          related_action_ids: ['action-3'],
        }),
        makeRuling('r3', {
          status: 'pending',
          related_action_ids: ['action-2', 'action-4'],
        }),
      ],
    }
    const { result } = renderHook(() => useCourtRulings())
    expect(result.current.challengedActionIds).toEqual(
      new Set(['action-1', 'action-2', 'action-4'])
    )
  })

  it('returns empty set when no pending rulings', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('r1', { status: 'decided', related_action_ids: ['action-1'] }),
      ],
    }
    const { result } = renderHook(() => useCourtRulings())
    expect(result.current.challengedActionIds.size).toBe(0)
  })

  it('handles rulings with empty related_action_ids', () => {
    mockData = {
      meta: {},
      rulings: [makeRuling('r1', { status: 'pending', related_action_ids: [] })],
    }
    const { result } = renderHook(() => useCourtRulings())
    expect(result.current.challengedActionIds.size).toBe(0)
  })

  // ─── Null/undefined edge cases ──────────────────────────

  it('handles ruling with null optional fields gracefully', () => {
    mockData = {
      meta: {},
      rulings: [
        makeRuling('r1', {
          argument_date: null,
          ruling_date: null,
          outcome: null,
          plaintiff: null,
          defendant: null,
          related_action_ids: null,
          timeline_events: null,
          affected_tariff_programs: null,
          affected_countries: null,
        }),
      ],
    }
    const { result } = renderHook(() => useCourtRulings())
    expect(result.current.allRulings).toHaveLength(1)
    expect(result.current.stats.total).toBe(1)
    expect(result.current.timelineEvents).toEqual([])
  })

  it('handles undefined filters gracefully', () => {
    mockData = {
      meta: {},
      rulings: [makeRuling('r1')],
    }
    const { result } = renderHook(() => useCourtRulings(undefined))
    expect(result.current.filteredRulings).toHaveLength(1)
  })

  // ─── Single ruling ──────────────────────────────────────

  it('works correctly with a single ruling', () => {
    mockData = {
      meta: {},
      rulings: [makeRuling('only')],
    }
    const { result } = renderHook(() => useCourtRulings())
    expect(result.current.allRulings).toHaveLength(1)
    expect(result.current.sortedRulings).toHaveLength(1)
    expect(result.current.stats.total).toBe(1)
    expect(result.current.stats.pending).toBe(1)
  })
})
