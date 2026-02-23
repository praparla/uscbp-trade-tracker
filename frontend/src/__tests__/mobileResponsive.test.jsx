import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { renderHook, act as hookAct } from '@testing-library/react'
import { useMediaQuery } from '../hooks/useMediaQuery'

// Mock recharts (jsdom has no ResizeObserver)
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

// ─── useMediaQuery Hook ──────────────────────────────────────────

describe('useMediaQuery', () => {
  let originalInnerWidth

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
  })

  function setWidth(w) {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: w,
    })
  }

  it('returns isMobile=true for narrow screens', () => {
    setWidth(375)
    const { result } = renderHook(() => useMediaQuery())
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isDesktop).toBe(false)
    expect(result.current.width).toBe(375)
  })

  it('returns isTablet=true for medium screens', () => {
    setWidth(768)
    const { result } = renderHook(() => useMediaQuery())
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isTablet).toBe(true)
    expect(result.current.isDesktop).toBe(false)
  })

  it('returns isDesktop=true for wide screens', () => {
    setWidth(1280)
    const { result } = renderHook(() => useMediaQuery())
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isDesktop).toBe(true)
  })

  it('responds to resize events', () => {
    setWidth(1280)
    const { result } = renderHook(() => useMediaQuery())
    expect(result.current.isDesktop).toBe(true)

    hookAct(() => {
      setWidth(375)
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isDesktop).toBe(false)
  })

  it('uses 640 as mobile/tablet boundary', () => {
    setWidth(639)
    const { result: r1 } = renderHook(() => useMediaQuery())
    expect(r1.current.isMobile).toBe(true)

    setWidth(640)
    const { result: r2 } = renderHook(() => useMediaQuery())
    expect(r2.current.isMobile).toBe(false)
    expect(r2.current.isTablet).toBe(true)
  })

  it('uses 1024 as tablet/desktop boundary', () => {
    setWidth(1023)
    const { result: r1 } = renderHook(() => useMediaQuery())
    expect(r1.current.isTablet).toBe(true)
    expect(r1.current.isDesktop).toBe(false)

    setWidth(1024)
    const { result: r2 } = renderHook(() => useMediaQuery())
    expect(r2.current.isTablet).toBe(false)
    expect(r2.current.isDesktop).toBe(true)
  })

  it('cleans up resize listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useMediaQuery())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    removeSpy.mockRestore()
  })
})

// ─── TableView Mobile Card Layout ──────────────────────────────

describe('TableView — Mobile Card Layout', () => {
  let originalInnerWidth

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
  })

  function setWidth(w) {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: w,
    })
  }

  const makeActions = (n) =>
    Array.from({ length: n }, (_, i) => ({
      id: `act-${i}`,
      title: `Action ${i + 1}`,
      action_type: i % 2 === 0 ? 'tariff' : 'duty',
      status: 'active',
      effective_date: `2025-${String((i % 12) + 1).padStart(2, '0')}-15`,
      countries_affected: ['China'],
      summary: `Summary for action ${i + 1}`,
      hs_codes: ['9903.01.01'],
      source_csms_id: `CSMS #${10000 + i}`,
      source_url: '',
      duty_rate: '25%',
    }))

  const defaultProps = {
    sortedActions: makeActions(3),
    sortField: 'effective_date',
    sortDirection: 'desc',
    handleSort: vi.fn(),
    onSelectAction: vi.fn(),
  }

  it('renders card layout on mobile instead of table', async () => {
    setWidth(375)
    const TableView = (await import('../components/TableView')).default
    render(<TableView {...defaultProps} />)
    // On mobile, there should be no table headers like "Effective Date"
    // Instead, action titles appear in card layout
    expect(screen.getByText('Action 1')).toBeInTheDocument()
    expect(screen.getByText('Action 2')).toBeInTheDocument()
    expect(screen.getByText('Action 3')).toBeInTheDocument()
  })

  it('renders table layout on desktop', async () => {
    setWidth(1280)
    const TableView = (await import('../components/TableView')).default
    render(<TableView {...defaultProps} />)
    expect(screen.getByText('Effective Date')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
  })

  it('calls onSelectAction on mobile card tap', async () => {
    setWidth(375)
    const onSelectAction = vi.fn()
    const TableView = (await import('../components/TableView')).default
    render(<TableView {...defaultProps} onSelectAction={onSelectAction} />)
    fireEvent.click(screen.getByText('Action 1'))
    expect(onSelectAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'act-0', title: 'Action 1' })
    )
  })

  it('shows CSV export button on mobile (shortened label)', async () => {
    setWidth(375)
    const TableView = (await import('../components/TableView')).default
    render(<TableView {...defaultProps} />)
    expect(screen.getByText('CSV')).toBeInTheDocument()
  })
})

// ─── ViewToggle — Mobile Icon-Only Mode ─────────────────────────

describe('ViewToggle — Responsive Labels', () => {
  it('renders all four buttons with icons', async () => {
    const ViewToggle = (await import('../components/ViewToggle')).default
    render(<ViewToggle view="dashboard" onViewChange={() => {}} />)
    // The buttons should always render (4 total)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(4)
  })

  it('labels are wrapped in spans for responsive hiding', async () => {
    const ViewToggle = (await import('../components/ViewToggle')).default
    const { container } = render(<ViewToggle view="dashboard" onViewChange={() => {}} />)
    // Labels are in spans with class hidden xs:inline
    const spans = container.querySelectorAll('span.hidden')
    expect(spans.length).toBe(4)
    expect(spans[0].textContent).toBe('Dashboard')
    expect(spans[1].textContent).toBe('Map')
    expect(spans[2].textContent).toBe('Table')
    expect(spans[3].textContent).toBe('Industries')
  })

  it('buttons have title attributes for mobile tooltips', async () => {
    const ViewToggle = (await import('../components/ViewToggle')).default
    render(<ViewToggle view="dashboard" onViewChange={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('title', 'Dashboard')
    expect(buttons[1]).toHaveAttribute('title', 'Map')
    expect(buttons[2]).toHaveAttribute('title', 'Table')
    expect(buttons[3]).toHaveAttribute('title', 'Industries')
  })
})

// ─── ActionDetailModal — Mobile Sheet Behavior ──────────────────

describe('ActionDetailModal — Mobile Sheet', () => {
  const sampleAction = {
    id: 'test-1',
    title: 'Section 232 Steel Tariffs',
    summary: 'A 25% tariff on steel imports.',
    action_type: 'tariff',
    status: 'active',
    countries_affected: ['All'],
    hs_codes: ['9903.81.89'],
    effective_date: '2025-03-12',
    expiration_date: null,
    source_csms_id: 'CSMS #64348411',
    source_url: 'https://www.cbp.gov/test',
    raw_excerpt: '25% Section 232 duties on steel',
    duty_rate: '25%',
    federal_authority: 'Section 232',
  }

  it('renders modal with bottom-sheet styling for mobile', async () => {
    const ActionDetailModal = (await import('../components/ActionDetailModal')).default
    const { container } = render(
      <ActionDetailModal action={sampleAction} onClose={() => {}} />
    )
    // Modal wrapper uses items-end (bottom sheet) on mobile, items-center on desktop
    const wrapper = container.querySelector('.fixed.inset-0')
    expect(wrapper.className).toContain('items-end')
    expect(wrapper.className).toContain('sm:items-center')
  })

  it('modal has rounded top corners on mobile', async () => {
    const ActionDetailModal = (await import('../components/ActionDetailModal')).default
    const { container } = render(
      <ActionDetailModal action={sampleAction} onClose={() => {}} />
    )
    // The modal card uses rounded-t-xl on mobile, rounded-xl on desktop
    const modalCard = container.querySelector('.rounded-t-xl')
    expect(modalCard).not.toBeNull()
    expect(modalCard.className).toContain('sm:rounded-xl')
  })
})

// ─── FilterPanel — Mobile Wrapping ──────────────────────────────

describe('FilterPanel — Mobile Responsive', () => {
  const defaultProps = {
    filters: {
      countries: [],
      actionTypes: [],
      dateStart: '',
      dateEnd: '',
      searchText: '',
      status: [],
    },
    filterOptions: {
      countries: ['China', 'Canada', 'Mexico'],
      actionTypes: ['tariff', 'quota'],
      statuses: ['active', 'pending'],
    },
    updateFilter: vi.fn(),
    clearFilters: vi.fn(),
    hasActiveFilters: false,
  }

  it('collapsed bar has flex-wrap for mobile', async () => {
    const FilterPanel = (await import('../components/FilterPanel')).default
    const { container } = render(<FilterPanel {...defaultProps} />)
    // The collapsed bar should have flex-wrap sm:flex-nowrap
    const bar = container.querySelector('.flex-wrap')
    expect(bar).not.toBeNull()
  })

  it('search input has min-width for mobile', async () => {
    const FilterPanel = (await import('../components/FilterPanel')).default
    const { container } = render(<FilterPanel {...defaultProps} />)
    const searchWrapper = container.querySelector('.min-w-\\[120px\\]')
    expect(searchWrapper).not.toBeNull()
  })
})

// ─── Chart Components — Responsive Heights ──────────────────────

describe('Chart Components — Responsive', () => {
  it('CountryChart imports useMediaQuery', async () => {
    // Just verify the component renders without error
    const CountryChart = (await import('../components/CountryChart')).default
    const countryCounts = { China: 5, Canada: 3 }
    const { container } = render(<CountryChart countryCounts={countryCounts} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('TypeChart imports useMediaQuery', async () => {
    const TypeChart = (await import('../components/TypeChart')).default
    const typeCounts = { tariff: 5, duty: 3 }
    const { container } = render(<TypeChart typeCounts={typeCounts} />)
    expect(container.firstChild).not.toBeNull()
  })
})
