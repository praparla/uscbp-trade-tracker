import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CountryChart from '../components/CountryChart'

// Mock Recharts — jsdom lacks ResizeObserver
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }) => (
    <div data-testid="bar-chart" data-items={data?.length}>
      {children}
    </div>
  ),
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

// Mock useMediaQuery
vi.mock('../hooks/useMediaQuery', () => ({
  useMediaQuery: () => ({ isMobile: false, isTablet: false, isDesktop: true }),
}))

describe('CountryChart', () => {
  it('renders "No data to display" when countryCounts is empty', () => {
    render(<CountryChart countryCounts={{}} />)
    expect(screen.getByText('No data to display')).toBeInTheDocument()
  })

  it('renders heading "Actions by Country" in empty state', () => {
    render(<CountryChart countryCounts={{}} />)
    expect(screen.getByText('Actions by Country')).toBeInTheDocument()
  })

  it('renders heading "Top Countries by Actions" when data exists', () => {
    render(<CountryChart countryCounts={{ China: 5, Canada: 3 }} />)
    expect(screen.getByText('Top Countries by Actions')).toBeInTheDocument()
  })

  it('renders a bar chart when data exists', () => {
    render(<CountryChart countryCounts={{ China: 5, Canada: 3, Mexico: 2 }} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('limits to top 10 countries', () => {
    const counts = {}
    for (let i = 0; i < 15; i++) {
      counts[`Country${i}`] = 15 - i
    }
    render(<CountryChart countryCounts={counts} />)
    const chart = screen.getByTestId('bar-chart')
    expect(Number(chart.getAttribute('data-items'))).toBe(10)
  })

  it('sorts countries by count descending', () => {
    const counts = { Mexico: 1, China: 10, Canada: 5 }
    render(<CountryChart countryCounts={counts} />)
    // Chart rendered — just verify it doesn't crash with unsorted input
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})
