import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MvpBanner from '../components/MvpBanner'
import ViewToggle from '../components/ViewToggle'
import SummaryCards from '../components/SummaryCards'
import FilterPanel from '../components/FilterPanel'
import ActionDetailModal from '../components/ActionDetailModal'
import { ACTION_TYPE_LABELS } from '../constants'

describe('MvpBanner', () => {
  it('renders nothing when no cap', () => {
    const { container } = render(<MvpBanner meta={{}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when cap is 0', () => {
    const { container } = render(
      <MvpBanner meta={{ max_pdfs_cap: 0, pdfs_processed: 3 }} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders banner when cap is positive', () => {
    render(<MvpBanner meta={{ max_pdfs_cap: 5, pdfs_processed: 5 }} />)
    expect(screen.getByText(/MVP Mode/)).toBeInTheDocument()
    expect(screen.getByText(/MAX_PDFS_TO_PROCESS/)).toBeInTheDocument()
  })

  it('reads bulletins_fetched when pdfs_processed is absent', () => {
    render(<MvpBanner meta={{ max_pdfs_cap: 200, bulletins_fetched: 41 }} />)
    expect(screen.getByText(/MVP Mode/)).toBeInTheDocument()
    expect(screen.getByText(/41 processed/)).toBeInTheDocument()
  })

  it('renders banner even when processed is less than cap', () => {
    render(<MvpBanner meta={{ max_pdfs_cap: 200, pdfs_processed: 10 }} />)
    expect(screen.getByText(/MVP Mode/)).toBeInTheDocument()
  })
})

describe('ViewToggle', () => {
  it('renders both buttons', () => {
    render(<ViewToggle view="dashboard" onViewChange={() => {}} />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Table')).toBeInTheDocument()
  })

  it('calls onViewChange when clicked', () => {
    const handler = vi.fn()
    render(<ViewToggle view="dashboard" onViewChange={handler} />)
    fireEvent.click(screen.getByText('Table'))
    expect(handler).toHaveBeenCalledWith('table')
  })

  it('highlights the active view', () => {
    const { rerender } = render(
      <ViewToggle view="dashboard" onViewChange={() => {}} />
    )
    const dashBtn = screen.getByText('Dashboard').closest('button')
    expect(dashBtn.className).toContain('bg-white')

    rerender(<ViewToggle view="table" onViewChange={() => {}} />)
    const tableBtn = screen.getByText('Table').closest('button')
    expect(tableBtn.className).toContain('bg-white')
  })
})

describe('SummaryCards', () => {
  const stats = {
    total: 24,
    active: 22,
    topCountry: { name: 'All', count: 10 },
    topType: { name: 'tariff', count: 18 },
    countryCounts: {},
    typeCounts: {},
  }

  it('renders all four stat cards', () => {
    render(<SummaryCards stats={stats} />)
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Tariff')).toBeInTheDocument()
  })

  it('shows sub-text for top country and type', () => {
    render(<SummaryCards stats={stats} />)
    expect(screen.getByText('10 actions')).toBeInTheDocument()
    expect(screen.getByText('18 actions')).toBeInTheDocument()
  })
})

describe('FilterPanel', () => {
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
      actionTypes: ['tariff', 'quota', 'sanction'],
      statuses: ['active', 'pending'],
    },
    updateFilter: vi.fn(),
    clearFilters: vi.fn(),
    hasActiveFilters: false,
  }

  it('renders search input', () => {
    render(<FilterPanel {...defaultProps} />)
    expect(screen.getByPlaceholderText('Search actions...')).toBeInTheDocument()
  })

  it('renders action type filter buttons', () => {
    render(<FilterPanel {...defaultProps} />)
    expect(screen.getByText('Tariff')).toBeInTheDocument()
    expect(screen.getByText('Quota')).toBeInTheDocument()
    expect(screen.getByText('Sanction')).toBeInTheDocument()
  })

  it('calls updateFilter on search input', () => {
    render(<FilterPanel {...defaultProps} />)
    const input = screen.getByPlaceholderText('Search actions...')
    fireEvent.change(input, { target: { value: 'steel' } })
    expect(defaultProps.updateFilter).toHaveBeenCalledWith('searchText', 'steel')
  })

  it('shows Clear all button only when filters are active', () => {
    const { rerender } = render(<FilterPanel {...defaultProps} />)
    expect(screen.queryByText('Clear all')).toBeNull()

    rerender(<FilterPanel {...defaultProps} hasActiveFilters={true} />)
    expect(screen.getByText('Clear all')).toBeInTheDocument()
  })

  it('calls clearFilters when Clear all is clicked', () => {
    render(<FilterPanel {...defaultProps} hasActiveFilters={true} />)
    fireEvent.click(screen.getByText('Clear all'))
    expect(defaultProps.clearFilters).toHaveBeenCalled()
  })

  it('renders status filter buttons', () => {
    render(<FilterPanel {...defaultProps} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('calls updateFilter when status button is clicked', () => {
    const updateFilter = vi.fn()
    render(<FilterPanel {...defaultProps} updateFilter={updateFilter} />)
    fireEvent.click(screen.getByText('Active'))
    expect(updateFilter).toHaveBeenCalledWith('status', ['active'])
  })
})

describe('ActionDetailModal', () => {
  const sampleAction = {
    id: 'test-1',
    title: 'Section 232 Steel Tariffs',
    summary: 'A 25% tariff on steel imports from all countries.',
    action_type: 'tariff',
    status: 'active',
    countries_affected: ['All'],
    hs_codes: ['9903.81.89', '9903.81.90'],
    effective_date: '2025-03-12',
    expiration_date: null,
    source_csms_id: 'CSMS #64348411',
    source_url: 'https://www.cbp.gov/trade/programs-administration/entry-summary/232-tariffs-aluminum-and-steel-faqs',
    raw_excerpt: '25% Section 232 duties on steel',
    duty_rate: '25%',
    federal_authority: 'Proclamation 10895, Section 232',
  }

  it('renders nothing when action is null', () => {
    const { container } = render(
      <ActionDetailModal action={null} onClose={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the action title', () => {
    render(<ActionDetailModal action={sampleAction} onClose={() => {}} />)
    expect(screen.getByText('Section 232 Steel Tariffs')).toBeInTheDocument()
  })

  it('renders summary, duty rate, and federal authority', () => {
    render(<ActionDetailModal action={sampleAction} onClose={() => {}} />)
    expect(screen.getByText(/25% tariff on steel/)).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('Proclamation 10895, Section 232')).toBeInTheDocument()
  })

  it('renders HTS codes', () => {
    render(<ActionDetailModal action={sampleAction} onClose={() => {}} />)
    expect(screen.getByText('9903.81.89')).toBeInTheDocument()
    expect(screen.getByText('9903.81.90')).toBeInTheDocument()
  })

  it('renders the formatted effective date', () => {
    render(<ActionDetailModal action={sampleAction} onClose={() => {}} />)
    expect(screen.getByText('Mar 12, 2025')).toBeInTheDocument()
  })

  it('renders source link', () => {
    render(<ActionDetailModal action={sampleAction} onClose={() => {}} />)
    const link = screen.getByText('View source document')
    expect(link).toHaveAttribute('href', sampleAction.source_url)
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<ActionDetailModal action={sampleAction} onClose={onClose} />)
    // The backdrop is the first div with bg-black/50
    const backdrop = document.querySelector('.bg-black\\/50')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })
})
