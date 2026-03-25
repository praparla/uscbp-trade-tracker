import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CourtRulingsView from '../components/CourtRulingsView'
import CourtRulingCard from '../components/CourtRulingCard'
import CourtRulingsTimeline from '../components/CourtRulingsTimeline'

// Mock useCourtRulings hook
const mockHookReturn = {
  sortedRulings: [],
  stats: { total: 0, pending: 0, decided: 0, programsChallenged: 0, byCourt: {}, byProgram: {} },
  timelineEvents: [],
  challengedActionIds: new Set(),
}
vi.mock('../hooks/useCourtRulings', () => ({
  useCourtRulings: () => mockHookReturn,
}))

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

// ─── CourtRulingsView ─────────────────────────────────────────

describe('CourtRulingsView', () => {
  it('renders empty state when no rulings', () => {
    mockHookReturn.sortedRulings = []
    mockHookReturn.stats = { total: 0, pending: 0, decided: 0, programsChallenged: 0, byCourt: {}, byProgram: {} }
    mockHookReturn.timelineEvents = []
    render(<CourtRulingsView filters={{}} onSelectAction={() => {}} />)
    expect(screen.getByText('No court rulings match your filters.')).toBeInTheDocument()
  })

  it('renders stats cards with correct values', () => {
    mockHookReturn.sortedRulings = [makeRuling('r1'), makeRuling('r2')]
    mockHookReturn.stats = { total: 12, pending: 4, decided: 6, programsChallenged: 3, byCourt: {}, byProgram: {} }
    mockHookReturn.timelineEvents = [{ date: '2025-06-01', event: 'Filed', type: 'filing', rulingId: 'r1', caseName: 'Case r1', rulingType: 'lawsuit' }]
    render(<CourtRulingsView filters={{}} onSelectAction={() => {}} />)
    expect(screen.getByText('Total Cases')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Programs Challenged')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders ruling cards', () => {
    const rulings = [makeRuling('r1'), makeRuling('r2')]
    mockHookReturn.sortedRulings = rulings
    mockHookReturn.stats = { total: 2, pending: 2, decided: 0, programsChallenged: 1, byCourt: {}, byProgram: {} }
    mockHookReturn.timelineEvents = []
    render(<CourtRulingsView filters={{}} onSelectAction={() => {}} />)
    expect(screen.getByTestId('court-ruling-card-r1')).toBeInTheDocument()
    expect(screen.getByTestId('court-ruling-card-r2')).toBeInTheDocument()
  })

  it('renders disclaimer', () => {
    mockHookReturn.sortedRulings = [makeRuling('r1')]
    mockHookReturn.stats = { total: 1, pending: 1, decided: 0, programsChallenged: 1, byCourt: {}, byProgram: {} }
    mockHookReturn.timelineEvents = []
    render(<CourtRulingsView filters={{}} onSelectAction={() => {}} />)
    expect(screen.getByTestId('court-rulings-disclaimer')).toBeInTheDocument()
  })
})

// ─── CourtRulingCard ──────────────────────────────────────────

describe('CourtRulingCard', () => {
  it('renders collapsed state with case name and badges', () => {
    const ruling = makeRuling('r1', {
      case_name: 'V.O.S. Selections v. United States',
      status: 'decided',
      ruling_type: 'ruling',
      outcome: 'struck_down',
      affected_tariff_programs: ['IEEPA'],
      affected_countries: ['Canada', 'Mexico'],
    })
    render(<CourtRulingCard ruling={ruling} />)
    expect(screen.getByText('V.O.S. Selections v. United States')).toBeInTheDocument()
    expect(screen.getByText('Ruling')).toBeInTheDocument()
    expect(screen.getByText('decided')).toBeInTheDocument()
    expect(screen.getByText('Struck Down')).toBeInTheDocument()
    expect(screen.getByText('IEEPA')).toBeInTheDocument()
    expect(screen.getByText('Canada')).toBeInTheDocument()
    expect(screen.getByText('Mexico')).toBeInTheDocument()
  })

  it('expands and collapses on click', () => {
    const ruling = makeRuling('r1', { summary: 'Detailed summary here' })
    render(<CourtRulingCard ruling={ruling} />)
    // Summary not visible when collapsed
    expect(screen.queryByText('Detailed summary here')).not.toBeInTheDocument()
    // Click to expand
    fireEvent.click(screen.getByTestId('court-ruling-card-r1'))
    expect(screen.getByText('Detailed summary here')).toBeInTheDocument()
    // Click to collapse
    fireEvent.click(screen.getByTestId('court-ruling-card-r1'))
    expect(screen.queryByText('Detailed summary here')).not.toBeInTheDocument()
  })

  it('shows timeline events when expanded', () => {
    const ruling = makeRuling('r1', {
      timeline_events: [
        { date: '2025-06-01', event: 'Complaint filed', type: 'filing' },
        { date: '2025-09-01', event: 'Oral arguments', type: 'argument' },
      ],
    })
    render(<CourtRulingCard ruling={ruling} />)
    fireEvent.click(screen.getByTestId('court-ruling-card-r1'))
    expect(screen.getByText('Complaint filed')).toBeInTheDocument()
    expect(screen.getByText('Oral arguments')).toBeInTheDocument()
  })

  it('shows key legal question when expanded', () => {
    const ruling = makeRuling('r1', {
      key_legal_question: 'Whether IEEPA authorizes tariffs',
    })
    render(<CourtRulingCard ruling={ruling} />)
    fireEvent.click(screen.getByTestId('court-ruling-card-r1'))
    expect(screen.getByText('Whether IEEPA authorizes tariffs')).toBeInTheDocument()
  })

  it('shows plaintiff and defendant when expanded', () => {
    const ruling = makeRuling('r1', {
      plaintiff: 'Learning Resources, Inc.',
      defendant: 'Donald J. Trump',
    })
    render(<CourtRulingCard ruling={ruling} />)
    fireEvent.click(screen.getByTestId('court-ruling-card-r1'))
    expect(screen.getByText('Learning Resources, Inc.')).toBeInTheDocument()
    expect(screen.getByText('Donald J. Trump')).toBeInTheDocument()
  })

  it('shows source link when expanded and source_url present', () => {
    const ruling = makeRuling('r1', {
      source_url: 'https://www.cit.uscourts.gov/test.pdf',
      source_name: 'U.S. Court of International Trade',
    })
    render(<CourtRulingCard ruling={ruling} />)
    fireEvent.click(screen.getByTestId('court-ruling-card-r1'))
    const link = screen.getByText('U.S. Court of International Trade')
    expect(link.closest('a')).toHaveAttribute('href', 'https://www.cit.uscourts.gov/test.pdf')
  })

  it('hides source link when source_url is empty', () => {
    const ruling = makeRuling('r1', { source_url: '' })
    render(<CourtRulingCard ruling={ruling} />)
    fireEvent.click(screen.getByTestId('court-ruling-card-r1'))
    expect(screen.queryByText('View source')).not.toBeInTheDocument()
  })

  it('handles null plaintiff and defendant', () => {
    const ruling = makeRuling('r1', { plaintiff: null, defendant: null })
    render(<CourtRulingCard ruling={ruling} />)
    fireEvent.click(screen.getByTestId('court-ruling-card-r1'))
    expect(screen.queryByText('Plaintiff')).not.toBeInTheDocument()
    expect(screen.queryByText('Defendant')).not.toBeInTheDocument()
  })

  it('handles null outcome', () => {
    const ruling = makeRuling('r1', { outcome: null })
    render(<CourtRulingCard ruling={ruling} />)
    expect(screen.queryByText('Struck Down')).not.toBeInTheDocument()
    expect(screen.queryByText('Upheld')).not.toBeInTheDocument()
  })

  it('handles empty timeline_events', () => {
    const ruling = makeRuling('r1', { timeline_events: [] })
    render(<CourtRulingCard ruling={ruling} />)
    fireEvent.click(screen.getByTestId('court-ruling-card-r1'))
    expect(screen.queryByText('Proceedings Timeline')).not.toBeInTheDocument()
  })

  it('handles null key_legal_question', () => {
    const ruling = makeRuling('r1', { key_legal_question: null })
    render(<CourtRulingCard ruling={ruling} />)
    fireEvent.click(screen.getByTestId('court-ruling-card-r1'))
    expect(screen.queryByText('Key Legal Question')).not.toBeInTheDocument()
  })

  it('truncates countries list when more than 3', () => {
    const ruling = makeRuling('r1', {
      affected_countries: ['Canada', 'Mexico', 'China', 'Brazil', 'India'],
    })
    render(<CourtRulingCard ruling={ruling} />)
    expect(screen.getByText('Canada')).toBeInTheDocument()
    expect(screen.getByText('Mexico')).toBeInTheDocument()
    expect(screen.getByText('China')).toBeInTheDocument()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
    expect(screen.queryByText('Brazil')).not.toBeInTheDocument()
  })

  it('displays dates with proper formatting', () => {
    const ruling = makeRuling('r1', {
      filing_date: '2025-06-15',
      argument_date: '2025-09-10',
      ruling_date: '2025-11-20',
    })
    render(<CourtRulingCard ruling={ruling} />)
    fireEvent.click(screen.getByTestId('court-ruling-card-r1'))
    // ruling_date appears both in header and expanded body, so use getAllByText
    expect(screen.getAllByText('Jun 15, 2025').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Sep 10, 2025').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Nov 20, 2025').length).toBeGreaterThanOrEqual(1)
  })

  it('shows N/A for null dates', () => {
    const ruling = makeRuling('r1', {
      filing_date: '2025-06-01',
      argument_date: null,
      ruling_date: null,
    })
    render(<CourtRulingCard ruling={ruling} />)
    fireEvent.click(screen.getByTestId('court-ruling-card-r1'))
    const naElements = screen.getAllByText('N/A')
    expect(naElements.length).toBeGreaterThanOrEqual(2) // argument + ruling
  })
})

// ─── CourtRulingsTimeline ─────────────────────────────────────

describe('CourtRulingsTimeline', () => {
  it('renders empty state when no events', () => {
    render(<CourtRulingsTimeline timelineEvents={[]} />)
    expect(screen.getByText('No timeline events to display.')).toBeInTheDocument()
  })

  it('renders empty state for null events', () => {
    render(<CourtRulingsTimeline timelineEvents={null} />)
    expect(screen.getByText('No timeline events to display.')).toBeInTheDocument()
  })

  it('renders timeline bar with dots', () => {
    const events = [
      { date: '2025-06-01', event: 'Filed', type: 'filing', rulingId: 'r1', caseName: 'Case 1', rulingType: 'lawsuit' },
      { date: '2025-09-01', event: 'Decided', type: 'ruling', rulingId: 'r2', caseName: 'Case 2', rulingType: 'ruling' },
    ]
    render(<CourtRulingsTimeline timelineEvents={events} />)
    expect(screen.getByTestId('timeline-bar')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-dot-0')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-dot-1')).toBeInTheDocument()
  })

  it('shows date range labels', () => {
    const events = [
      { date: '2025-03-01', event: 'Start', type: 'filing', rulingId: 'r1', caseName: 'C1', rulingType: 'lawsuit' },
      { date: '2025-12-01', event: 'End', type: 'ruling', rulingId: 'r2', caseName: 'C2', rulingType: 'ruling' },
    ]
    render(<CourtRulingsTimeline timelineEvents={events} />)
    expect(screen.getByText('Mar 1, 2025')).toBeInTheDocument()
    expect(screen.getByText('Dec 1, 2025')).toBeInTheDocument()
  })

  it('calls onSelectEvent when dot clicked', () => {
    const onSelect = vi.fn()
    const events = [
      { date: '2025-06-01', event: 'Filed', type: 'filing', rulingId: 'r1', caseName: 'Case 1', rulingType: 'lawsuit' },
    ]
    render(<CourtRulingsTimeline timelineEvents={events} onSelectEvent={onSelect} />)
    fireEvent.click(screen.getByTestId('timeline-dot-0'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    const calledWith = onSelect.mock.calls[0][0]
    expect(calledWith.rulingId).toBe('r1')
    expect(calledWith.event).toBe('Filed')
  })

  it('handles single event (min === max date)', () => {
    const events = [
      { date: '2025-06-01', event: 'Only event', type: 'filing', rulingId: 'r1', caseName: 'C1', rulingType: 'lawsuit' },
    ]
    render(<CourtRulingsTimeline timelineEvents={events} />)
    expect(screen.getByTestId('timeline-dot-0')).toBeInTheDocument()
  })

  it('renders legend for present ruling types only', () => {
    const events = [
      { date: '2025-06-01', event: 'Filed', type: 'filing', rulingId: 'r1', caseName: 'C1', rulingType: 'lawsuit' },
      { date: '2025-09-01', event: 'Voted', type: 'ruling', rulingId: 'r2', caseName: 'C2', rulingType: 'congressional_action' },
    ]
    render(<CourtRulingsTimeline timelineEvents={events} />)
    expect(screen.getByText('lawsuit')).toBeInTheDocument()
    expect(screen.getByText('congressional action')).toBeInTheDocument()
    expect(screen.queryByText('ruling')).not.toBeInTheDocument()
    expect(screen.queryByText('appeal')).not.toBeInTheDocument()
  })
})
