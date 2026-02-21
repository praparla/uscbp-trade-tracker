import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import IndustryView from '../components/IndustryView'
import IndustryComparisonChart from '../components/IndustryComparisonChart'
import IndustryRateChart from '../components/IndustryRateChart'
import IndustryCard from '../components/IndustryCard'

// Mock Recharts — jsdom doesn't have ResizeObserver
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

// Helper — creates an action matching a known ACTION_INDUSTRY_MAP entry
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

// ─── IndustryView ───────────────────────────────────────────────

describe('IndustryView', () => {
  const actions = [
    makeAction('csms-64348411-s232-steel'),
    makeAction('csms-64348288-s232-aluminum'),
    makeAction('csms-64624801-s232-autos'),
    makeAction('csms-63577329-s301-4yr-review'),
  ]

  it('renders stats cards', () => {
    render(<IndustryView filteredActions={actions} onSelectAction={() => {}} />)
    expect(screen.getByText('Industries Affected')).toBeInTheDocument()
    expect(screen.getByText('Largest Sector')).toBeInTheDocument()
    expect(screen.getByText('Sector-Actions')).toBeInTheDocument()
  })

  it('shows correct industries count', () => {
    render(<IndustryView filteredActions={actions} onSelectAction={() => {}} />)
    // primary-metals (steel + alum), automotive (autos), semiconductors (s301), consumer-goods (s301)
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('renders chart sections', () => {
    render(<IndustryView filteredActions={actions} onSelectAction={() => {}} />)
    expect(screen.getByText('Actions by Industry Sector')).toBeInTheDocument()
    expect(screen.getByText('Max Tariff Rate by Sector')).toBeInTheDocument()
  })

  it('renders sector cards', () => {
    render(<IndustryView filteredActions={actions} onSelectAction={() => {}} />)
    // Primary Metals appears in both stats card (largest sector) and sector card
    expect(screen.getAllByText('Primary Metals').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Automotive')).toBeInTheDocument()
  })

  it('renders source disclaimer', () => {
    render(<IndustryView filteredActions={actions} onSelectAction={() => {}} />)
    expect(screen.getByTestId('industry-disclaimer')).toBeInTheDocument()
    expect(screen.getByText(/Verified data cited from CSMS bulletins/)).toBeInTheDocument()
  })

  it('shows empty state with no actions', () => {
    render(<IndustryView filteredActions={[]} onSelectAction={() => {}} />)
    expect(screen.getByText('No trade actions match your filters.')).toBeInTheDocument()
  })

  it('does not show charts in empty state', () => {
    render(<IndustryView filteredActions={[]} onSelectAction={() => {}} />)
    expect(screen.queryByText('Actions by Industry Sector')).toBeNull()
    expect(screen.queryByText('Max Tariff Rate by Sector')).toBeNull()
  })
})

// ─── IndustryComparisonChart ────────────────────────────────────

describe('IndustryComparisonChart', () => {
  it('shows empty message with no data', () => {
    render(<IndustryComparisonChart chartData={[]} />)
    expect(screen.getByText('No data to display')).toBeInTheDocument()
  })

  it('renders title with data', () => {
    const data = [
      { sector: 'Primary Metals', sectorId: 'primary-metals', actions: 3, active: 2, color: '#6366f1' },
    ]
    render(<IndustryComparisonChart chartData={data} />)
    expect(screen.getByText('Actions by Industry Sector')).toBeInTheDocument()
  })

  it('renders bar chart container', () => {
    const data = [
      { sector: 'Primary Metals', sectorId: 'primary-metals', actions: 3, active: 2, color: '#6366f1' },
    ]
    render(<IndustryComparisonChart chartData={data} />)
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })
})

// ─── IndustryRateChart ──────────────────────────────────────────

describe('IndustryRateChart', () => {
  it('shows empty message with no data', () => {
    render(<IndustryRateChart rateChartData={[]} />)
    expect(screen.getByText('No rate data to display')).toBeInTheDocument()
  })

  it('renders title with data', () => {
    const data = [
      { sector: 'Primary Metals', sectorId: 'primary-metals', maxRate: 50, color: '#6366f1' },
    ]
    render(<IndustryRateChart rateChartData={data} />)
    expect(screen.getByText('Max Tariff Rate by Sector')).toBeInTheDocument()
  })

  it('renders bar chart container', () => {
    const data = [
      { sector: 'Primary Metals', sectorId: 'primary-metals', maxRate: 50, color: '#6366f1' },
    ]
    render(<IndustryRateChart rateChartData={data} />)
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })
})

// ─── IndustryCard ───────────────────────────────────────────────

describe('IndustryCard', () => {
  const sectorData = {
    id: 'primary-metals',
    label: 'Primary Metals',
    color: '#6366f1',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    description: 'Steel, aluminum, copper, and timber tariffs.',
    actionCount: 3,
    activeCount: 2,
    dutyRateRange: '25%-50%',
    maxRate: 50,
    countries: ['All', 'Canada'],
    hsCodeCount: 5,
    dateRange: { earliest: '2025-03-12', latest: '2025-08-01' },
    statusBreakdown: { active: 2, superseded: 1, expired: 0, pending: 0 },
    actions: [
      makeAction('csms-64348411-s232-steel', { title: 'Steel Tariff 25%' }),
      makeAction('csms-64348288-s232-aluminum', { title: 'Aluminum Tariff 25%' }),
      makeAction('csms-65794272-s232-copper', { title: 'Copper Tariff 50%', duty_rate: '50%' }),
    ],
    estimates: {
      verified: [
        { claim: 'Steel tariff rate', value: '25%', csms_id: '64348411',
          excerpt: '25 percent import duty on all imports of steel articles' },
        { claim: 'Copper tariff rate', value: '50%', csms_id: '65794272',
          excerpt: 'ad valorem tariff of 50 percent' },
      ],
      external: [
        { claim: 'Est. per-vehicle price increase', value: '~$4,000',
          source: 'Yale Budget Lab',
          url: 'https://budgetlab.yale.edu/research/auto-tariffs' },
      ],
      keyMetric: 'Copper at 50% — highest Section 232 rate',
    },
  }

  it('renders collapsed state with label and description', () => {
    render(<IndustryCard sector={sectorData} onSelectAction={() => {}} />)
    expect(screen.getByText('Primary Metals')).toBeInTheDocument()
    expect(screen.getByText(/Steel, aluminum, copper/)).toBeInTheDocument()
  })

  it('shows metric pills in collapsed state', () => {
    render(<IndustryCard sector={sectorData} onSelectAction={() => {}} />)
    expect(screen.getByText('3 actions')).toBeInTheDocument()
    expect(screen.getByText('2 active')).toBeInTheDocument()
    expect(screen.getByText('25%-50%')).toBeInTheDocument()
    expect(screen.getByText('2 countries')).toBeInTheDocument()
    expect(screen.getByText('5 HS codes')).toBeInTheDocument()
  })

  it('shows key metric', () => {
    render(<IndustryCard sector={sectorData} onSelectAction={() => {}} />)
    expect(screen.getByText(/Copper at 50%/)).toBeInTheDocument()
  })

  it('does not show expanded content by default', () => {
    render(<IndustryCard sector={sectorData} onSelectAction={() => {}} />)
    expect(screen.queryByTestId('verified-section')).toBeNull()
    expect(screen.queryByTestId('external-section')).toBeNull()
  })

  it('expands on click to show verified and external sections', () => {
    render(<IndustryCard sector={sectorData} onSelectAction={() => {}} />)
    fireEvent.click(screen.getByTestId('industry-card-primary-metals'))

    expect(screen.getByTestId('verified-section')).toBeInTheDocument()
    expect(screen.getByText(/Verified from CSMS Bulletins/)).toBeInTheDocument()
    expect(screen.getByText(/Steel tariff rate/)).toBeInTheDocument()
    expect(screen.getByText('CSMS #64348411')).toBeInTheDocument()

    expect(screen.getByTestId('external-section')).toBeInTheDocument()
    expect(screen.getByText(/External Estimates/)).toBeInTheDocument()
    expect(screen.getByText(/Est. per-vehicle price increase/)).toBeInTheDocument()
  })

  it('shows action list when expanded', () => {
    render(<IndustryCard sector={sectorData} onSelectAction={() => {}} />)
    fireEvent.click(screen.getByTestId('industry-card-primary-metals'))

    expect(screen.getByText('Trade Actions (3)')).toBeInTheDocument()
    expect(screen.getByText('Steel Tariff 25%')).toBeInTheDocument()
    expect(screen.getByText('Aluminum Tariff 25%')).toBeInTheDocument()
    expect(screen.getByText('Copper Tariff 50%')).toBeInTheDocument()
  })

  it('calls onSelectAction when an action row is clicked', () => {
    const onSelect = vi.fn()
    render(<IndustryCard sector={sectorData} onSelectAction={onSelect} />)
    fireEvent.click(screen.getByTestId('industry-card-primary-metals'))
    fireEvent.click(screen.getByTestId('action-row-csms-64348411-s232-steel'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(sectorData.actions[0])
  })

  it('collapses on second click', () => {
    render(<IndustryCard sector={sectorData} onSelectAction={() => {}} />)
    fireEvent.click(screen.getByTestId('industry-card-primary-metals'))
    expect(screen.getByTestId('verified-section')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('industry-card-primary-metals'))
    expect(screen.queryByTestId('verified-section')).toBeNull()
  })

  it('hides countries pill when countries array is empty', () => {
    const noCountries = { ...sectorData, countries: [] }
    render(<IndustryCard sector={noCountries} onSelectAction={() => {}} />)
    expect(screen.queryByText(/countries/)).toBeNull()
  })

  it('hides HS codes pill when hsCodeCount is 0', () => {
    const noCodes = { ...sectorData, hsCodeCount: 0 }
    render(<IndustryCard sector={noCodes} onSelectAction={() => {}} />)
    expect(screen.queryByText(/HS codes/)).toBeNull()
  })

  it('hides external section when no external estimates', () => {
    const noExt = {
      ...sectorData,
      estimates: { ...sectorData.estimates, external: [] },
    }
    render(<IndustryCard sector={noExt} onSelectAction={() => {}} />)
    fireEvent.click(screen.getByTestId('industry-card-primary-metals'))
    expect(screen.queryByTestId('external-section')).toBeNull()
  })

  it('hides verified section when no verified claims', () => {
    const noVerified = {
      ...sectorData,
      estimates: { ...sectorData.estimates, verified: [] },
    }
    render(<IndustryCard sector={noVerified} onSelectAction={() => {}} />)
    fireEvent.click(screen.getByTestId('industry-card-primary-metals'))
    expect(screen.queryByTestId('verified-section')).toBeNull()
  })

  it('displays duty_rate for action rows when available', () => {
    render(<IndustryCard sector={sectorData} onSelectAction={() => {}} />)
    fireEvent.click(screen.getByTestId('industry-card-primary-metals'))
    // 50% appears in both the verified claim value and the action row duty_rate
    const matches = screen.getAllByText('50%')
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('displays N/A for actions with null effective_date', () => {
    const withNullDate = {
      ...sectorData,
      actions: [
        makeAction('csms-64348411-s232-steel', { title: 'Steel', effective_date: null }),
      ],
    }
    render(<IndustryCard sector={withNullDate} onSelectAction={() => {}} />)
    fireEvent.click(screen.getByTestId('industry-card-primary-metals'))
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('sorts action rows by date descending when expanded', () => {
    const withDates = {
      ...sectorData,
      actions: [
        makeAction('csms-64348411-s232-steel', { title: 'Early Action', effective_date: '2025-01-01' }),
        makeAction('csms-64348288-s232-aluminum', { title: 'Late Action', effective_date: '2025-12-01' }),
        makeAction('csms-65794272-s232-copper', { title: 'Mid Action', effective_date: '2025-06-15' }),
      ],
    }
    render(<IndustryCard sector={withDates} onSelectAction={() => {}} />)
    fireEvent.click(screen.getByTestId('industry-card-primary-metals'))

    const actionButtons = screen.getAllByTestId(/action-row-/)
    expect(actionButtons[0]).toHaveTextContent('Late Action')
    expect(actionButtons[1]).toHaveTextContent('Mid Action')
    expect(actionButtons[2]).toHaveTextContent('Early Action')
  })

  it('renders CSMS # citations for verified claims', () => {
    render(<IndustryCard sector={sectorData} onSelectAction={() => {}} />)
    fireEvent.click(screen.getByTestId('industry-card-primary-metals'))
    expect(screen.getByText('CSMS #64348411')).toBeInTheDocument()
    expect(screen.getByText('CSMS #65794272')).toBeInTheDocument()
  })

  it('renders source attribution as clickable link for external claims with url', () => {
    render(<IndustryCard sector={sectorData} onSelectAction={() => {}} />)
    fireEvent.click(screen.getByTestId('industry-card-primary-metals'))
    const link = screen.getByText(/Yale Budget Lab/)
    expect(link).toBeInTheDocument()
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', 'https://budgetlab.yale.edu/research/auto-tariffs')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders source as plain text when external claim has no url', () => {
    const noUrlSector = {
      ...sectorData,
      estimates: {
        ...sectorData.estimates,
        external: [{ claim: 'Some estimate', value: '~$10B', source: 'Generic report' }],
      },
    }
    render(<IndustryCard sector={noUrlSector} onSelectAction={() => {}} />)
    fireEvent.click(screen.getByTestId('industry-card-primary-metals'))
    const source = screen.getByText(/Generic report/)
    expect(source.tagName).toBe('SPAN')
  })

  it('hides key metric when keyMetric is empty string', () => {
    const noMetric = {
      ...sectorData,
      estimates: { ...sectorData.estimates, keyMetric: '' },
    }
    render(<IndustryCard sector={noMetric} onSelectAction={() => {}} />)
    expect(screen.queryByText(/highest Section 232/)).toBeNull()
  })
})

// ─── IndustryComparisonChart (additional) ─────────────────────────────

describe('IndustryComparisonChart (additional)', () => {
  it('renders with multiple data entries', () => {
    const data = [
      { sector: 'Primary Metals', sectorId: 'primary-metals', actions: 5, active: 3, color: '#6366f1' },
      { sector: 'Automotive', sectorId: 'automotive', actions: 4, active: 4, color: '#ef4444' },
      { sector: 'Consumer Goods', sectorId: 'consumer-goods', actions: 18, active: 15, color: '#3b82f6' },
    ]
    render(<IndustryComparisonChart chartData={data} />)
    expect(screen.getByText('Actions by Industry Sector')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('renders heading even in empty state', () => {
    render(<IndustryComparisonChart chartData={[]} />)
    expect(screen.getByText('Actions by Industry')).toBeInTheDocument()
  })
})

// ─── IndustryRateChart (additional) ───────────────────────────────────

describe('IndustryRateChart (additional)', () => {
  it('renders with multiple data entries', () => {
    const data = [
      { sector: 'Primary Metals', sectorId: 'primary-metals', maxRate: 50, color: '#6366f1' },
      { sector: 'Automotive', sectorId: 'automotive', maxRate: 25, color: '#ef4444' },
    ]
    render(<IndustryRateChart rateChartData={data} />)
    expect(screen.getByText('Max Tariff Rate by Sector')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})

// ─── IndustryView (additional) ────────────────────────────────────────

describe('IndustryView (additional)', () => {
  it('shows largest sector action count', () => {
    const actions = [
      makeAction('csms-64348411-s232-steel'),
      makeAction('csms-64348288-s232-aluminum'),
      makeAction('csms-65794272-s232-copper'),
      makeAction('csms-64624801-s232-autos'),
    ]
    render(<IndustryView filteredActions={actions} onSelectAction={() => {}} />)
    // Primary metals has 3 actions → appears in both stats card and sector pill
    const matches = screen.getAllByText('3 actions')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('renders multiple sector cards with data-testids', () => {
    const actions = [
      makeAction('csms-64348411-s232-steel'),
      makeAction('csms-64624801-s232-autos'),
      makeAction('csms-sanctions-russia', { duty_rate: 'Prohibited' }),
    ]
    render(<IndustryView filteredActions={actions} onSelectAction={() => {}} />)
    expect(screen.getByTestId('industry-card-primary-metals')).toBeInTheDocument()
    expect(screen.getByTestId('industry-card-automotive')).toBeInTheDocument()
    expect(screen.getByTestId('industry-card-luxury-goods')).toBeInTheDocument()
  })
})
