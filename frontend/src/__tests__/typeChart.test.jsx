import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TypeChart from '../components/TypeChart'

// Mock Recharts — jsdom lacks ResizeObserver
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

// Mock useMediaQuery
vi.mock('../hooks/useMediaQuery', () => ({
  useMediaQuery: () => ({ isMobile: false, isTablet: false, isDesktop: true }),
}))

describe('TypeChart', () => {
  it('renders "No data to display" when typeCounts is empty', () => {
    render(<TypeChart typeCounts={{}} />)
    expect(screen.getByText('No data to display')).toBeInTheDocument()
  })

  it('renders heading "Actions by Type" in empty state', () => {
    render(<TypeChart typeCounts={{}} />)
    expect(screen.getByText('Actions by Type')).toBeInTheDocument()
  })

  it('renders heading "Actions by Type" when data exists', () => {
    render(<TypeChart typeCounts={{ tariff: 10, duty: 5 }} />)
    expect(screen.getByText('Actions by Type')).toBeInTheDocument()
  })

  it('renders a pie chart when data exists', () => {
    render(<TypeChart typeCounts={{ tariff: 10, duty: 5, sanction: 2 }} />)
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('handles a single action type', () => {
    render(<TypeChart typeCounts={{ tariff: 10 }} />)
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('handles unknown action types gracefully', () => {
    render(<TypeChart typeCounts={{ unknown_type: 3 }} />)
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })
})
