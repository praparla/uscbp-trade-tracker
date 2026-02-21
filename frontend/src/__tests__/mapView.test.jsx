import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MapCountryDetail from '../components/MapCountryDetail'
import MapLegend from '../components/MapLegend'

// Mock react-simple-maps since jsdom can't render SVG/d3-geo
vi.mock('react-simple-maps', () => ({
  ComposableMap: ({ children, ...props }) => (
    <div data-testid="composable-map" {...props}>
      {children}
    </div>
  ),
  Geographies: ({ children }) => children({ geographies: [] }),
  Geography: () => null,
}))

// Mock the TopoJSON data
vi.mock('../data/countries-110m.json', () => ({
  default: { type: 'Topology', objects: { countries: { geometries: [] } } },
}))

describe('MapCountryDetail', () => {
  const targetedActions = [
    {
      id: 'act-1',
      title: 'Section 232 Steel Tariffs',
      action_type: 'tariff',
      status: 'active',
      effective_date: '2025-03-12',
      duty_rate: '25%',
      countries_affected: ['China'],
    },
    {
      id: 'act-2',
      title: 'IEEPA Duties on Chinese Goods',
      action_type: 'duty',
      status: 'active',
      effective_date: '2025-02-04',
      duty_rate: '10%',
      countries_affected: ['China'],
    },
    {
      id: 'act-3',
      title: 'Section 301 Review',
      action_type: 'tariff',
      status: 'pending',
      effective_date: null,
      countries_affected: ['China'],
    },
  ]

  const globalActions = [
    {
      id: 'act-g1',
      title: 'Reciprocal Tariffs Baseline',
      action_type: 'tariff',
      status: 'active',
      effective_date: '2025-04-05',
      duty_rate: '10%',
      countries_affected: ['All'],
    },
  ]

  it('renders country name and total action count', () => {
    render(
      <MapCountryDetail
        countryName="China"
        targetedActions={targetedActions}
        globalActions={globalActions}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('China')).toBeInTheDocument()
    // Total count badge: 3 targeted + 1 global = 4
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('renders grouped sections: Targeted and Global', () => {
    render(
      <MapCountryDetail
        countryName="China"
        targetedActions={targetedActions}
        globalActions={globalActions}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('Targeted')).toBeInTheDocument()
    expect(screen.getByText('Global')).toBeInTheDocument()
    expect(screen.getByText('(3)')).toBeInTheDocument() // targeted count
    expect(screen.getByText(/\(1\)/)).toBeInTheDocument() // global count
  })

  it('renders action titles', () => {
    render(
      <MapCountryDetail
        countryName="China"
        targetedActions={targetedActions}
        globalActions={globalActions}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('Section 232 Steel Tariffs')).toBeInTheDocument()
    expect(screen.getByText('IEEPA Duties on Chinese Goods')).toBeInTheDocument()
    expect(screen.getByText('Section 301 Review')).toBeInTheDocument()
    expect(screen.getByText('Reciprocal Tariffs Baseline')).toBeInTheDocument()
  })

  it('renders duty rate when present', () => {
    render(
      <MapCountryDetail
        countryName="China"
        targetedActions={targetedActions}
        globalActions={[]}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('10%')).toBeInTheDocument()
  })

  it('calls onSelectAction when action row is clicked', () => {
    const handler = vi.fn()
    render(
      <MapCountryDetail
        countryName="China"
        targetedActions={targetedActions}
        globalActions={[]}
        onSelectAction={handler}
        onClose={() => {}}
      />
    )
    fireEvent.click(screen.getByText('Section 232 Steel Tariffs'))
    expect(handler).toHaveBeenCalledWith(targetedActions[0])
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <MapCountryDetail
        countryName="China"
        targetedActions={targetedActions}
        globalActions={[]}
        onSelectAction={() => {}}
        onClose={onClose}
      />
    )
    const closeButton = screen.getByLabelText('Close country detail')
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows empty message when no actions for country', () => {
    render(
      <MapCountryDetail
        countryName="Germany"
        targetedActions={[]}
        globalActions={[]}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(
      screen.getByText(/No trade actions match current filters for Germany/)
    ).toBeInTheDocument()
  })

  it('handles undefined targeted/global props', () => {
    render(
      <MapCountryDetail
        countryName="Germany"
        targetedActions={undefined}
        globalActions={undefined}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('handles null targeted/global props', () => {
    render(
      <MapCountryDetail
        countryName="Germany"
        targetedActions={null}
        globalActions={null}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows only targeted section when no global actions', () => {
    render(
      <MapCountryDetail
        countryName="China"
        targetedActions={targetedActions}
        globalActions={[]}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('Targeted')).toBeInTheDocument()
    expect(screen.queryByText('Global')).toBeNull()
  })

  it('shows only global section when no targeted actions', () => {
    render(
      <MapCountryDetail
        countryName="Germany"
        targetedActions={[]}
        globalActions={globalActions}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.queryByText('Targeted')).toBeNull()
    expect(screen.getByText('Global')).toBeInTheDocument()
  })

  it('displays formatted date for actions with effective_date', () => {
    render(
      <MapCountryDetail
        countryName="China"
        targetedActions={[targetedActions[0]]}
        globalActions={[]}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('Mar 12, 2025')).toBeInTheDocument()
  })

  it('displays N/A for actions without effective_date', () => {
    render(
      <MapCountryDetail
        countryName="China"
        targetedActions={[targetedActions[2]]}
        globalActions={[]}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('truncates long country names in header', () => {
    render(
      <MapCountryDetail
        countryName="Democratic Republic of the Congo"
        targetedActions={[]}
        globalActions={[]}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    const header = screen.getByText('Democratic Republic of the Congo')
    expect(header.className).toContain('truncate')
  })
})

describe('MapLegend', () => {
  it('renders gradient bar with 0 and max labels', () => {
    render(<MapLegend maxCount={15} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('shows "No data" when maxCount is 0', () => {
    render(<MapLegend maxCount={0} />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('renders the "Country-targeted trade actions" label', () => {
    render(<MapLegend maxCount={5} />)
    expect(screen.getByText('Country-targeted trade actions')).toBeInTheDocument()
  })

  it('renders gradient SVG when data exists', () => {
    const { container } = render(<MapLegend maxCount={10} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders gray bar when no data', () => {
    const { container } = render(<MapLegend maxCount={0} />)
    expect(container.querySelector('svg')).toBeNull()
  })
})

describe('MapView (mocked)', () => {
  let MapView

  beforeEach(async () => {
    const mod = await import('../components/MapView')
    MapView = mod.default
  })

  it('renders empty state when no actions', () => {
    render(<MapView filteredActions={[]} onSelectAction={() => {}} />)
    expect(screen.getByText(/No trade actions match your filters/)).toBeInTheDocument()
  })

  it('renders map container when actions exist', () => {
    const actions = [
      {
        id: '1',
        title: 'Test Action',
        countries_affected: ['China'],
        action_type: 'tariff',
        status: 'active',
        effective_date: '2025-01-01',
      },
    ]
    render(<MapView filteredActions={actions} onSelectAction={() => {}} />)
    expect(screen.getByTestId('composable-map')).toBeInTheDocument()
    expect(screen.getByText('Trade Actions by Country')).toBeInTheDocument()
  })

  it('shows global actions badge when "All" actions exist', () => {
    const actions = [
      {
        id: '1',
        title: 'Global Tariff',
        countries_affected: ['All'],
        action_type: 'tariff',
        status: 'active',
        effective_date: '2025-01-01',
      },
      {
        id: '2',
        title: 'Another Global',
        countries_affected: ['All'],
        action_type: 'duty',
        status: 'active',
        effective_date: '2025-02-01',
      },
    ]
    render(<MapView filteredActions={actions} onSelectAction={() => {}} />)
    expect(screen.getByText(/2 global actions apply to all countries/)).toBeInTheDocument()
  })

  it('hides global actions badge when no "All" actions', () => {
    const actions = [
      {
        id: '1',
        title: 'Test',
        countries_affected: ['China'],
        action_type: 'tariff',
        status: 'active',
        effective_date: '2025-01-01',
      },
    ]
    render(<MapView filteredActions={actions} onSelectAction={() => {}} />)
    expect(screen.queryByText(/global actions apply to all countries/)).toBeNull()
  })
})
