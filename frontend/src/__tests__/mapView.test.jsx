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
  const sampleActions = [
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

  it('renders country name and action count', () => {
    render(
      <MapCountryDetail
        countryName="China"
        actions={sampleActions}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('China')).toBeInTheDocument()
    expect(screen.getByText('3 actions')).toBeInTheDocument()
  })

  it('renders singular "action" for count of 1', () => {
    render(
      <MapCountryDetail
        countryName="Canada"
        actions={[sampleActions[0]]}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('1 action')).toBeInTheDocument()
  })

  it('renders action titles', () => {
    render(
      <MapCountryDetail
        countryName="China"
        actions={sampleActions}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('Section 232 Steel Tariffs')).toBeInTheDocument()
    expect(screen.getByText('IEEPA Duties on Chinese Goods')).toBeInTheDocument()
    expect(screen.getByText('Section 301 Review')).toBeInTheDocument()
  })

  it('renders duty rate when present', () => {
    render(
      <MapCountryDetail
        countryName="China"
        actions={sampleActions}
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
        actions={sampleActions}
        onSelectAction={handler}
        onClose={() => {}}
      />
    )
    fireEvent.click(screen.getByText('Section 232 Steel Tariffs'))
    expect(handler).toHaveBeenCalledWith(sampleActions[0])
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <MapCountryDetail
        countryName="China"
        actions={sampleActions}
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
        actions={[]}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('0 actions')).toBeInTheDocument()
    expect(
      screen.getByText(/No trade actions match current filters for Germany/)
    ).toBeInTheDocument()
  })

  it('handles undefined actions prop', () => {
    render(
      <MapCountryDetail
        countryName="Germany"
        actions={undefined}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('0 actions')).toBeInTheDocument()
  })

  it('handles null actions prop', () => {
    render(
      <MapCountryDetail
        countryName="Germany"
        actions={null}
        onSelectAction={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('0 actions')).toBeInTheDocument()
  })

  it('displays formatted date for actions with effective_date', () => {
    render(
      <MapCountryDetail
        countryName="China"
        actions={[sampleActions[0]]}
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
        actions={[sampleActions[2]]}
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
        actions={[]}
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
    render(<MapLegend maxCount={15} allCountryCount={2} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('shows allCountryCount note when present', () => {
    render(<MapLegend maxCount={10} allCountryCount={3} />)
    expect(
      screen.getByText(/\+3 actions affect all countries/)
    ).toBeInTheDocument()
  })

  it('uses singular "action" when allCountryCount is 1', () => {
    render(<MapLegend maxCount={10} allCountryCount={1} />)
    expect(
      screen.getByText(/\+1 action affect all countries/)
    ).toBeInTheDocument()
  })

  it('hides allCountryCount note when 0', () => {
    render(<MapLegend maxCount={10} allCountryCount={0} />)
    expect(screen.queryByText(/affect all countries/)).toBeNull()
  })

  it('shows "No data" when maxCount is 0', () => {
    render(<MapLegend maxCount={0} allCountryCount={0} />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('renders the "Trade actions per country" label', () => {
    render(<MapLegend maxCount={5} allCountryCount={0} />)
    expect(screen.getByText('Trade actions per country')).toBeInTheDocument()
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
})
