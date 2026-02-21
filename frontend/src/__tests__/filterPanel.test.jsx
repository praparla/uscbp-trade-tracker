import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FilterPanel from '../components/FilterPanel'

const makeProps = (overrides = {}) => ({
  filters: {
    countries: [],
    actionTypes: [],
    dateStart: '',
    dateEnd: '',
    searchText: '',
    status: [],
  },
  filterOptions: {
    countries: ['China', 'Canada', 'Mexico', 'India', 'Brazil'],
    actionTypes: ['tariff', 'quota', 'sanction'],
    statuses: ['active', 'pending', 'expired'],
  },
  updateFilter: vi.fn(),
  clearFilters: vi.fn(),
  hasActiveFilters: false,
  ...overrides,
})

// Helper: expand the filter panel
const expand = () => fireEvent.click(screen.getByText('Filters'))

// Helper: open the country dropdown (must expand first)
// When countries are selected, the trigger says "N countries" / "1 country" instead of "Countries"
const openCountryDropdown = (selectedCount = 0) => {
  expand()
  if (selectedCount === 0) {
    fireEvent.click(screen.getByText('Countries'))
  } else if (selectedCount === 1) {
    // The dropdown trigger and the pill may both say "1 country"
    // The trigger is inside the expanded section — get all and click the one in expanded area
    const buttons = screen.getAllByText(/1 country/)
    // Click the last one (the dropdown trigger in expanded section)
    fireEvent.click(buttons[buttons.length - 1])
  } else {
    const buttons = screen.getAllByText(new RegExp(`${selectedCount} countr`))
    fireEvent.click(buttons[buttons.length - 1])
  }
}

describe('FilterPanel — Collapsible Behavior', () => {
  it('starts collapsed: search visible, filter controls hidden', () => {
    render(<FilterPanel {...makeProps()} />)
    expect(screen.getByPlaceholderText('Search actions...')).toBeInTheDocument()
    // Action type buttons should NOT be visible until expanded
    expect(screen.queryByText('Tariff')).toBeNull()
    expect(screen.queryByText('Quota')).toBeNull()
  })

  it('expands on Filters click, shows all filter controls', () => {
    render(<FilterPanel {...makeProps()} />)
    expand()
    expect(screen.getByText('Tariff')).toBeInTheDocument()
    expect(screen.getByText('Quota')).toBeInTheDocument()
    expect(screen.getByText('Sanction')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Expired')).toBeInTheDocument()
  })

  it('collapses again on second Filters click', () => {
    render(<FilterPanel {...makeProps()} />)
    expand() // open
    expect(screen.getByText('Tariff')).toBeInTheDocument()
    expand() // close
    expect(screen.queryByText('Tariff')).toBeNull()
  })

  it('shows active filter count badge when filters are set', () => {
    const props = makeProps({
      filters: {
        countries: ['China'],
        actionTypes: ['tariff'],
        dateStart: '',
        dateEnd: '',
        searchText: 'steel',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    // 3 active: searchText + countries + actionTypes
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('does not show badge when no filters are set', () => {
    render(<FilterPanel {...makeProps()} />)
    // The only numbers should not include a badge
    const filtersBtn = screen.getByText('Filters').closest('button')
    expect(filtersBtn.textContent).not.toMatch(/\d/)
  })

  it('counts date range as single filter', () => {
    const props = makeProps({
      filters: {
        countries: [],
        actionTypes: [],
        dateStart: '2025-01-01',
        dateEnd: '2025-06-01',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})

describe('FilterPanel — Active Filter Pills', () => {
  it('shows country pill when countries are selected', () => {
    const props = makeProps({
      filters: {
        countries: ['China', 'Canada'],
        actionTypes: [],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    expect(screen.getByText(/2 countries/)).toBeInTheDocument()
  })

  it('shows singular "country" for single selection', () => {
    const props = makeProps({
      filters: {
        countries: ['China'],
        actionTypes: [],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    expect(screen.getByText(/1 country/)).toBeInTheDocument()
  })

  it('shows action type pill with count', () => {
    const props = makeProps({
      filters: {
        countries: [],
        actionTypes: ['tariff', 'quota'],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    expect(screen.getByText(/2 types/)).toBeInTheDocument()
  })

  it('shows singular "type" for single type selection', () => {
    const props = makeProps({
      filters: {
        countries: [],
        actionTypes: ['tariff'],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    expect(screen.getByText(/1 type$/)).toBeInTheDocument()
  })

  it('shows status pill with count', () => {
    const props = makeProps({
      filters: {
        countries: [],
        actionTypes: [],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: ['active', 'pending'],
      },
    })
    render(<FilterPanel {...props} />)
    expect(screen.getByText(/2 status/)).toBeInTheDocument()
  })

  it('shows date range pill when dates are set', () => {
    const props = makeProps({
      filters: {
        countries: [],
        actionTypes: [],
        dateStart: '2025-01-01',
        dateEnd: '',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    expect(screen.getByText('date range')).toBeInTheDocument()
  })

  it('clears countries when pill X is clicked', () => {
    const updateFilter = vi.fn()
    const props = makeProps({
      updateFilter,
      filters: {
        countries: ['China'],
        actionTypes: [],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    const pill = screen.getByText(/1 country/).closest('span')
    const xBtn = pill.querySelector('button')
    fireEvent.click(xBtn)
    expect(updateFilter).toHaveBeenCalledWith('countries', [])
  })

  it('clears action types when pill X is clicked', () => {
    const updateFilter = vi.fn()
    const props = makeProps({
      updateFilter,
      filters: {
        countries: [],
        actionTypes: ['tariff'],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    const pill = screen.getByText(/1 type/).closest('span')
    const xBtn = pill.querySelector('button')
    fireEvent.click(xBtn)
    expect(updateFilter).toHaveBeenCalledWith('actionTypes', [])
  })

  it('clears status when pill X is clicked', () => {
    const updateFilter = vi.fn()
    const props = makeProps({
      updateFilter,
      filters: {
        countries: [],
        actionTypes: [],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: ['active'],
      },
    })
    render(<FilterPanel {...props} />)
    const pill = screen.getByText(/1 status/).closest('span')
    const xBtn = pill.querySelector('button')
    fireEvent.click(xBtn)
    expect(updateFilter).toHaveBeenCalledWith('status', [])
  })

  it('clears date range when pill X is clicked', () => {
    const updateFilter = vi.fn()
    const props = makeProps({
      updateFilter,
      filters: {
        countries: [],
        actionTypes: [],
        dateStart: '2025-01-01',
        dateEnd: '2025-06-01',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    const pill = screen.getByText('date range').closest('span')
    const xBtn = pill.querySelector('button')
    fireEvent.click(xBtn)
    expect(updateFilter).toHaveBeenCalledWith('dateStart', '')
    expect(updateFilter).toHaveBeenCalledWith('dateEnd', '')
  })
})

describe('FilterPanel — Date Inputs', () => {
  it('renders date inputs when expanded', () => {
    render(<FilterPanel {...makeProps()} />)
    expand()
    const dateInputs = document.querySelectorAll('input[type="date"]')
    expect(dateInputs.length).toBe(2)
  })

  it('calls updateFilter with dateStart on change', () => {
    const updateFilter = vi.fn()
    render(<FilterPanel {...makeProps({ updateFilter })} />)
    expand()
    const dateInputs = document.querySelectorAll('input[type="date"]')
    fireEvent.change(dateInputs[0], { target: { value: '2025-03-01' } })
    expect(updateFilter).toHaveBeenCalledWith('dateStart', '2025-03-01')
  })

  it('calls updateFilter with dateEnd on change', () => {
    const updateFilter = vi.fn()
    render(<FilterPanel {...makeProps({ updateFilter })} />)
    expand()
    const dateInputs = document.querySelectorAll('input[type="date"]')
    fireEvent.change(dateInputs[1], { target: { value: '2025-12-31' } })
    expect(updateFilter).toHaveBeenCalledWith('dateEnd', '2025-12-31')
  })
})

describe('FilterPanel — Action Type Toggles', () => {
  it('calls updateFilter to add action type when clicked', () => {
    const updateFilter = vi.fn()
    render(<FilterPanel {...makeProps({ updateFilter })} />)
    expand()
    fireEvent.click(screen.getByText('Tariff'))
    expect(updateFilter).toHaveBeenCalledWith('actionTypes', ['tariff'])
  })

  it('calls updateFilter to remove action type when already selected', () => {
    const updateFilter = vi.fn()
    const props = makeProps({
      updateFilter,
      filters: {
        countries: [],
        actionTypes: ['tariff', 'quota'],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    expand()
    fireEvent.click(screen.getByText('Tariff'))
    expect(updateFilter).toHaveBeenCalledWith('actionTypes', ['quota'])
  })
})

describe('FilterPanel — Status Toggles', () => {
  it('calls updateFilter to add status when clicked', () => {
    const updateFilter = vi.fn()
    render(<FilterPanel {...makeProps({ updateFilter })} />)
    expand()
    fireEvent.click(screen.getByText('Active'))
    expect(updateFilter).toHaveBeenCalledWith('status', ['active'])
  })

  it('calls updateFilter to remove status when already selected', () => {
    const updateFilter = vi.fn()
    const props = makeProps({
      updateFilter,
      filters: {
        countries: [],
        actionTypes: [],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: ['active', 'pending'],
      },
    })
    render(<FilterPanel {...props} />)
    expand()
    fireEvent.click(screen.getByText('Active'))
    expect(updateFilter).toHaveBeenCalledWith('status', ['pending'])
  })
})

describe('FilterPanel — CountryDropdown', () => {
  it('renders Countries trigger button when expanded', () => {
    render(<FilterPanel {...makeProps()} />)
    expand()
    expect(screen.getByText('Countries')).toBeInTheDocument()
  })

  it('opens dropdown on click, shows search and country list', () => {
    render(<FilterPanel {...makeProps()} />)
    openCountryDropdown()
    expect(screen.getByPlaceholderText('Search countries...')).toBeInTheDocument()
    expect(screen.getByText('China')).toBeInTheDocument()
    expect(screen.getByText('Canada')).toBeInTheDocument()
    expect(screen.getByText('Mexico')).toBeInTheDocument()
    expect(screen.getByText('India')).toBeInTheDocument()
    expect(screen.getByText('Brazil')).toBeInTheDocument()
  })

  it('filters countries by search input', () => {
    render(<FilterPanel {...makeProps()} />)
    openCountryDropdown()
    const searchInput = screen.getByPlaceholderText('Search countries...')
    fireEvent.change(searchInput, { target: { value: 'can' } })
    expect(screen.getByText('Canada')).toBeInTheDocument()
    expect(screen.queryByText('China')).toBeNull()
    expect(screen.queryByText('Mexico')).toBeNull()
  })

  it('shows "No matches" when search has no results', () => {
    render(<FilterPanel {...makeProps()} />)
    openCountryDropdown()
    const searchInput = screen.getByPlaceholderText('Search countries...')
    fireEvent.change(searchInput, { target: { value: 'zzzzz' } })
    expect(screen.getByText('No matches')).toBeInTheDocument()
  })

  it('toggles country selection on click', () => {
    const updateFilter = vi.fn()
    render(<FilterPanel {...makeProps({ updateFilter })} />)
    openCountryDropdown()
    fireEvent.click(screen.getByText('China'))
    expect(updateFilter).toHaveBeenCalledWith('countries', ['China'])
  })

  it('deselects country on second click', () => {
    const updateFilter = vi.fn()
    const props = makeProps({
      updateFilter,
      filters: {
        countries: ['China'],
        actionTypes: [],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    openCountryDropdown(1)
    fireEvent.click(screen.getByText('China'))
    expect(updateFilter).toHaveBeenCalledWith('countries', [])
  })

  it('supports multiple country selections', () => {
    const updateFilter = vi.fn()
    const props = makeProps({
      updateFilter,
      filters: {
        countries: ['China'],
        actionTypes: [],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    openCountryDropdown(1)
    fireEvent.click(screen.getByText('Canada'))
    expect(updateFilter).toHaveBeenCalledWith('countries', ['China', 'Canada'])
  })

  it('shows selected count in trigger when countries are selected', () => {
    const props = makeProps({
      filters: {
        countries: ['China', 'Canada', 'Mexico'],
        actionTypes: [],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    expand()
    // "3 countries" appears in both the pill (collapsed bar) and dropdown trigger (expanded)
    const matches = screen.getAllByText('3 countries')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('shows "1 country" singular when one country selected', () => {
    const props = makeProps({
      filters: {
        countries: ['China'],
        actionTypes: [],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    expand()
    // Appears in both pill and dropdown trigger
    const matches = screen.getAllByText('1 country')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('shows footer with count and clear button when countries selected', () => {
    const props = makeProps({
      filters: {
        countries: ['China', 'Canada'],
        actionTypes: [],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    openCountryDropdown(2)
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    expect(screen.getByText('Clear')).toBeInTheDocument()
  })

  it('clears all countries when Clear button in dropdown is clicked', () => {
    const updateFilter = vi.fn()
    const props = makeProps({
      updateFilter,
      filters: {
        countries: ['China', 'Canada'],
        actionTypes: [],
        dateStart: '',
        dateEnd: '',
        searchText: '',
        status: [],
      },
    })
    render(<FilterPanel {...props} />)
    openCountryDropdown(2)
    fireEvent.click(screen.getByText('Clear'))
    expect(updateFilter).toHaveBeenCalledWith('countries', [])
  })

  it('does not show footer when no countries selected', () => {
    render(<FilterPanel {...makeProps()} />)
    openCountryDropdown()
    expect(screen.queryByText('selected')).toBeNull()
    expect(screen.queryByText('Clear')).toBeNull()
  })

  it('closes dropdown on click outside', () => {
    render(<FilterPanel {...makeProps()} />)
    openCountryDropdown()
    expect(screen.getByPlaceholderText('Search countries...')).toBeInTheDocument()

    // Click outside the dropdown
    fireEvent.mouseDown(document.body)
    expect(screen.queryByPlaceholderText('Search countries...')).toBeNull()
  })

  it('search is case-insensitive', () => {
    render(<FilterPanel {...makeProps()} />)
    openCountryDropdown()
    const searchInput = screen.getByPlaceholderText('Search countries...')
    fireEvent.change(searchInput, { target: { value: 'CHINA' } })
    expect(screen.getByText('China')).toBeInTheDocument()
  })
})
