import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardView from '../components/DashboardView'

// Mock Recharts components — they need ResizeObserver which jsdom doesn't have
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Bar: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

const stats = {
  total: 24,
  active: 22,
  topCountry: { name: 'All', count: 10 },
  topType: { name: 'tariff', count: 18 },
  countryCounts: { All: 10, China: 8, Canada: 6 },
  typeCounts: { tariff: 18, duty: 4, sanction: 2 },
}

const sampleActions = [
  {
    id: 'act-1',
    title: 'Test Tariff',
    action_type: 'tariff',
    status: 'active',
    effective_date: '2025-03-12',
    countries_affected: ['China'],
  },
  {
    id: 'act-2',
    title: 'Test Duty',
    action_type: 'duty',
    status: 'active',
    effective_date: '2025-04-01',
    countries_affected: ['Canada'],
  },
]

describe('DashboardView — Rendering', () => {
  it('renders summary cards', () => {
    render(
      <DashboardView stats={stats} filteredActions={sampleActions} onSelectAction={() => {}} />
    )
    // Summary card values
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
  })

  it('renders country chart section', () => {
    render(
      <DashboardView stats={stats} filteredActions={sampleActions} onSelectAction={() => {}} />
    )
    expect(screen.getByText('Top Countries by Actions')).toBeInTheDocument()
  })

  it('renders type chart section', () => {
    render(
      <DashboardView stats={stats} filteredActions={sampleActions} onSelectAction={() => {}} />
    )
    expect(screen.getByText('Actions by Type')).toBeInTheDocument()
  })

  it('renders timeline section', () => {
    render(
      <DashboardView stats={stats} filteredActions={sampleActions} onSelectAction={() => {}} />
    )
    expect(screen.getByText('Timeline')).toBeInTheDocument()
  })
})

describe('DashboardView — Empty State', () => {
  it('shows empty state message when no actions match filters', () => {
    render(
      <DashboardView stats={stats} filteredActions={[]} onSelectAction={() => {}} />
    )
    expect(screen.getByText('No trade actions match your filters.')).toBeInTheDocument()
    expect(screen.getByText(/Try adjusting or clearing filters/)).toBeInTheDocument()
  })

  it('still renders summary cards in empty state', () => {
    render(
      <DashboardView stats={stats} filteredActions={[]} onSelectAction={() => {}} />
    )
    // Summary cards should still show even with no filtered actions
    expect(screen.getByText('24')).toBeInTheDocument()
  })

  it('does not render charts in empty state', () => {
    render(
      <DashboardView stats={stats} filteredActions={[]} onSelectAction={() => {}} />
    )
    expect(screen.queryByText('Top Countries by Actions')).toBeNull()
    expect(screen.queryByText('Actions by Type')).toBeNull()
  })
})

describe('DashboardView — Chart Empty States', () => {
  it('shows country chart "No data" when countryCounts is empty', () => {
    const emptyStats = { ...stats, countryCounts: {} }
    render(
      <DashboardView
        stats={emptyStats}
        filteredActions={sampleActions}
        onSelectAction={() => {}}
      />
    )
    expect(screen.getByText('Actions by Country')).toBeInTheDocument()
    expect(screen.getByText('No data to display')).toBeInTheDocument()
  })

  it('shows type chart "No data" when typeCounts is empty', () => {
    const emptyStats = { ...stats, typeCounts: {} }
    render(
      <DashboardView
        stats={emptyStats}
        filteredActions={sampleActions}
        onSelectAction={() => {}}
      />
    )
    expect(screen.getAllByText('No data to display').length).toBeGreaterThanOrEqual(1)
  })
})

describe('DashboardView — Timeline', () => {
  it('shows "No dated actions" when all actions lack effective_date', () => {
    const undatedActions = sampleActions.map((a) => ({
      ...a,
      effective_date: null,
    }))
    render(
      <DashboardView
        stats={stats}
        filteredActions={undatedActions}
        onSelectAction={() => {}}
      />
    )
    expect(screen.getByText('No dated actions to display')).toBeInTheDocument()
  })
})
