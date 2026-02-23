import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RefreshButton from '../components/RefreshButton'

describe('RefreshButton', () => {
  it('renders nothing when isDevMode is false', () => {
    const { container } = render(
      <RefreshButton isDevMode={false} isRefreshing={false} onRefresh={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders button when isDevMode is true', () => {
    render(
      <RefreshButton isDevMode={true} isRefreshing={false} onRefresh={() => {}} />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('Refresh Data')).toBeInTheDocument()
  })

  it('shows "Refreshing..." when isRefreshing is true', () => {
    render(
      <RefreshButton isDevMode={true} isRefreshing={true} onRefresh={() => {}} />
    )
    expect(screen.getByText('Refreshing...')).toBeInTheDocument()
    expect(screen.queryByText('Refresh Data')).toBeNull()
  })

  it('disables button when isRefreshing is true', () => {
    render(
      <RefreshButton isDevMode={true} isRefreshing={true} onRefresh={() => {}} />
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('button is enabled when not refreshing', () => {
    render(
      <RefreshButton isDevMode={true} isRefreshing={false} onRefresh={() => {}} />
    )
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('calls onRefresh when clicked', () => {
    const handler = vi.fn()
    render(
      <RefreshButton isDevMode={true} isRefreshing={false} onRefresh={handler} />
    )
    fireEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('has correct title attribute', () => {
    render(
      <RefreshButton isDevMode={true} isRefreshing={false} onRefresh={() => {}} />
    )
    expect(screen.getByRole('button')).toHaveAttribute('title', 'Re-run scraper pipeline')
  })

  it('applies animate-spin class when refreshing', () => {
    const { container } = render(
      <RefreshButton isDevMode={true} isRefreshing={true} onRefresh={() => {}} />
    )
    const svg = container.querySelector('svg')
    expect(svg.className.baseVal || svg.getAttribute('class')).toContain('animate-spin')
  })
})
