import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ActionDetailModal from '../components/ActionDetailModal'

describe('ActionDetailModal — Empty/Missing Optional Fields', () => {
  // Minimal action with only required fields
  const minimalAction = {
    id: 'min-1',
    title: 'Minimal Action',
    summary: 'A basic summary.',
    action_type: 'tariff',
    status: 'active',
    countries_affected: ['China'],
    effective_date: '2025-06-01',
    source_csms_id: 'CSMS #99999',
  }

  it('does not render source link when source_url is empty string', () => {
    const action = { ...minimalAction, source_url: '' }
    render(<ActionDetailModal action={action} onClose={() => {}} />)
    expect(screen.queryByText('View source document')).toBeNull()
  })

  it('does not render source link when source_url is null', () => {
    const action = { ...minimalAction, source_url: null }
    render(<ActionDetailModal action={action} onClose={() => {}} />)
    expect(screen.queryByText('View source document')).toBeNull()
  })

  it('does not render source link when source_url is undefined', () => {
    render(<ActionDetailModal action={minimalAction} onClose={() => {}} />)
    expect(screen.queryByText('View source document')).toBeNull()
  })

  it('renders source link when source_url is present', () => {
    const action = { ...minimalAction, source_url: 'https://example.gov/doc' }
    render(<ActionDetailModal action={action} onClose={() => {}} />)
    const link = screen.getByText('View source document')
    expect(link).toHaveAttribute('href', 'https://example.gov/doc')
  })

  it('does not render duty rate section when duty_rate is absent', () => {
    render(<ActionDetailModal action={minimalAction} onClose={() => {}} />)
    expect(screen.queryByText('Duty Rate')).toBeNull()
  })

  it('renders duty rate section when duty_rate is present', () => {
    const action = { ...minimalAction, duty_rate: '25%' }
    render(<ActionDetailModal action={action} onClose={() => {}} />)
    expect(screen.getByText('Duty Rate')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('does not render federal authority section when absent', () => {
    render(<ActionDetailModal action={minimalAction} onClose={() => {}} />)
    expect(screen.queryByText('Federal Authority')).toBeNull()
  })

  it('renders federal authority section when present', () => {
    const action = { ...minimalAction, federal_authority: 'Section 232' }
    render(<ActionDetailModal action={action} onClose={() => {}} />)
    expect(screen.getByText('Federal Authority')).toBeInTheDocument()
    expect(screen.getByText('Section 232')).toBeInTheDocument()
  })

  it('does not render HTS codes section when hs_codes is absent', () => {
    render(<ActionDetailModal action={minimalAction} onClose={() => {}} />)
    expect(screen.queryByText('HTS Codes')).toBeNull()
  })

  it('does not render HTS codes section when hs_codes is empty array', () => {
    const action = { ...minimalAction, hs_codes: [] }
    render(<ActionDetailModal action={action} onClose={() => {}} />)
    expect(screen.queryByText('HTS Codes')).toBeNull()
  })

  it('renders HTS codes when hs_codes has entries', () => {
    const action = { ...minimalAction, hs_codes: ['7206.10'] }
    render(<ActionDetailModal action={action} onClose={() => {}} />)
    expect(screen.getByText('HTS Codes')).toBeInTheDocument()
    expect(screen.getByText('7206.10')).toBeInTheDocument()
  })

  it('does not render excerpt when raw_excerpt is absent', () => {
    render(<ActionDetailModal action={minimalAction} onClose={() => {}} />)
    expect(screen.queryByText('Excerpt')).toBeNull()
  })

  it('renders excerpt when raw_excerpt is present', () => {
    const action = { ...minimalAction, raw_excerpt: 'Pursuant to Section 301...' }
    render(<ActionDetailModal action={action} onClose={() => {}} />)
    expect(screen.getByText('Excerpt')).toBeInTheDocument()
    expect(screen.getByText('Pursuant to Section 301...')).toBeInTheDocument()
  })

  it('shows "N/A" for expiration date when null', () => {
    const action = { ...minimalAction, expiration_date: null }
    render(<ActionDetailModal action={action} onClose={() => {}} />)
    const expLabels = screen.getAllByText('N/A')
    expect(expLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('renders expiration date when present', () => {
    const action = { ...minimalAction, expiration_date: '2026-12-31' }
    render(<ActionDetailModal action={action} onClose={() => {}} />)
    expect(screen.getByText('Dec 31, 2026')).toBeInTheDocument()
  })

  it('handles missing countries_affected gracefully', () => {
    const action = { ...minimalAction, countries_affected: undefined }
    render(<ActionDetailModal action={action} onClose={() => {}} />)
    expect(screen.getByText('Countries Affected')).toBeInTheDocument()
    // No country badges rendered, but no crash
  })
})

describe('ActionDetailModal — Type & Status Badges', () => {
  const baseAction = {
    id: 'badge-1',
    title: 'Badge Test',
    summary: 'Testing badges.',
    action_type: 'embargo',
    status: 'pending',
    countries_affected: ['All'],
    effective_date: '2025-01-20',
    source_csms_id: 'CSMS #00001',
  }

  it('renders the correct action type label', () => {
    render(<ActionDetailModal action={baseAction} onClose={() => {}} />)
    expect(screen.getByText('Embargo')).toBeInTheDocument()
  })

  it('renders the correct status label', () => {
    render(<ActionDetailModal action={baseAction} onClose={() => {}} />)
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('falls back for unknown action types', () => {
    const action = { ...baseAction, action_type: 'custom_type' }
    render(<ActionDetailModal action={action} onClose={() => {}} />)
    expect(screen.getByText('custom_type')).toBeInTheDocument()
  })
})
