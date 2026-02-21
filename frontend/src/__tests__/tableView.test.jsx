import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TableView from '../components/TableView'

// Generate N mock actions for pagination testing
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

describe('TableView — Rendering', () => {
  it('renders table with column headers', () => {
    render(<TableView {...defaultProps} />)
    expect(screen.getByText('Effective Date')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Countries')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Summary')).toBeInTheDocument()
  })

  it('renders action count in header bar', () => {
    render(<TableView {...defaultProps} />)
    expect(screen.getByText(/3 actions/)).toBeInTheDocument()
  })

  it('renders singular "action" for 1 item', () => {
    render(<TableView {...defaultProps} sortedActions={makeActions(1)} />)
    // Text is split across nodes: "1" + " action" — use a function matcher
    const header = screen.getByText((_, el) => {
      return el?.tagName === 'DIV' && el?.textContent === '1 action'
    })
    expect(header).toBeInTheDocument()
  })

  it('renders action titles in rows', () => {
    render(<TableView {...defaultProps} />)
    expect(screen.getByText('Action 1')).toBeInTheDocument()
    expect(screen.getByText('Action 2')).toBeInTheDocument()
    expect(screen.getByText('Action 3')).toBeInTheDocument()
  })

  it('renders formatted dates', () => {
    const actions = [
      {
        ...makeActions(1)[0],
        effective_date: '2025-03-15',
      },
    ]
    render(<TableView {...defaultProps} sortedActions={actions} />)
    expect(screen.getByText('Mar 15, 2025')).toBeInTheDocument()
  })

  it('renders "--" for missing dates', () => {
    const actions = [
      {
        ...makeActions(1)[0],
        effective_date: null,
      },
    ]
    render(<TableView {...defaultProps} sortedActions={actions} />)
    expect(screen.getByText('--')).toBeInTheDocument()
  })

  it('renders action type badges', () => {
    render(<TableView {...defaultProps} />)
    expect(screen.getAllByText('Tariff').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Duty').length).toBeGreaterThan(0)
  })

  it('renders country tags', () => {
    render(<TableView {...defaultProps} />)
    expect(screen.getAllByText('China').length).toBe(3)
  })

  it('truncates countries to first 3 with +N overflow', () => {
    const actions = [
      {
        ...makeActions(1)[0],
        countries_affected: ['China', 'Canada', 'Mexico', 'India', 'Brazil'],
      },
    ]
    render(<TableView {...defaultProps} sortedActions={actions} />)
    expect(screen.getByText('China')).toBeInTheDocument()
    expect(screen.getByText('Canada')).toBeInTheDocument()
    expect(screen.getByText('Mexico')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('renders Export CSV button', () => {
    render(<TableView {...defaultProps} />)
    expect(screen.getByText('Export CSV')).toBeInTheDocument()
  })

  it('renders empty state when no actions', () => {
    render(<TableView {...defaultProps} sortedActions={[]} />)
    expect(screen.getByText('No trade actions match your filters.')).toBeInTheDocument()
  })
})

describe('TableView — Sorting', () => {
  it('calls handleSort when sortable column header is clicked', () => {
    const handleSort = vi.fn()
    render(<TableView {...defaultProps} handleSort={handleSort} />)
    fireEvent.click(screen.getByText('Effective Date'))
    expect(handleSort).toHaveBeenCalledWith('effective_date')
  })

  it('calls handleSort with title field', () => {
    const handleSort = vi.fn()
    render(<TableView {...defaultProps} handleSort={handleSort} />)
    fireEvent.click(screen.getByText('Title'))
    expect(handleSort).toHaveBeenCalledWith('title')
  })

  it('calls handleSort with action_type field', () => {
    const handleSort = vi.fn()
    render(<TableView {...defaultProps} handleSort={handleSort} />)
    fireEvent.click(screen.getByText('Type'))
    expect(handleSort).toHaveBeenCalledWith('action_type')
  })

  it('calls handleSort with status field', () => {
    const handleSort = vi.fn()
    render(<TableView {...defaultProps} handleSort={handleSort} />)
    fireEvent.click(screen.getByText('Status'))
    expect(handleSort).toHaveBeenCalledWith('status')
  })

  it('does not call handleSort for non-sortable columns', () => {
    const handleSort = vi.fn()
    render(<TableView {...defaultProps} handleSort={handleSort} />)
    fireEvent.click(screen.getByText('Countries'))
    expect(handleSort).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Summary'))
    expect(handleSort).not.toHaveBeenCalled()
  })
})

describe('TableView — Row Click', () => {
  it('calls onSelectAction with action when row is clicked', () => {
    const onSelectAction = vi.fn()
    render(<TableView {...defaultProps} onSelectAction={onSelectAction} />)
    fireEvent.click(screen.getByText('Action 1'))
    expect(onSelectAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'act-0', title: 'Action 1' })
    )
  })
})

describe('TableView — Pagination', () => {
  it('does not show pagination for small datasets', () => {
    render(<TableView {...defaultProps} sortedActions={makeActions(5)} />)
    expect(screen.queryByText('Previous')).toBeNull()
    expect(screen.queryByText('Next')).toBeNull()
  })

  it('shows pagination for datasets exceeding page size', () => {
    render(<TableView {...defaultProps} sortedActions={makeActions(30)} />)
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText(/page 1 of 2/)).toBeInTheDocument()
  })

  it('navigates to next page when Next is clicked', () => {
    render(<TableView {...defaultProps} sortedActions={makeActions(30)} />)
    expect(screen.getByText('Action 1')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('Action 26')).toBeInTheDocument()
    expect(screen.queryByText('Action 1')).toBeNull()
  })

  it('navigates back when Previous is clicked', () => {
    render(<TableView {...defaultProps} sortedActions={makeActions(30)} />)
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('Action 26')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Previous'))
    expect(screen.getByText('Action 1')).toBeInTheDocument()
  })

  it('disables Previous on first page', () => {
    render(<TableView {...defaultProps} sortedActions={makeActions(30)} />)
    const prev = screen.getByText('Previous')
    expect(prev).toBeDisabled()
  })

  it('disables Next on last page', () => {
    render(<TableView {...defaultProps} sortedActions={makeActions(30)} />)
    fireEvent.click(screen.getByText('Next'))
    const next = screen.getByText('Next')
    expect(next).toBeDisabled()
  })

  it('renders page number buttons', () => {
    render(<TableView {...defaultProps} sortedActions={makeActions(30)} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('navigates to specific page when page number clicked', () => {
    render(<TableView {...defaultProps} sortedActions={makeActions(30)} />)
    fireEvent.click(screen.getByText('2'))
    expect(screen.getByText('Action 26')).toBeInTheDocument()
  })
})

describe('TableView — CSV Export', () => {
  it('creates a download link when Export CSV is clicked', () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    globalThis.URL.createObjectURL = createObjectURL
    globalThis.URL.revokeObjectURL = revokeObjectURL

    // Mock link click
    const clickSpy = vi.fn()
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreateElement(tag)
      if (tag === 'a') {
        el.click = clickSpy
      }
      return el
    })

    render(<TableView {...defaultProps} />)
    fireEvent.click(screen.getByText('Export CSV'))

    expect(createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalled()

    document.createElement.mockRestore()
  })
})
