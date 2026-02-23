import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TimelineChart from '../components/TimelineChart'

describe('TimelineChart', () => {
  const makeAction = (id, date, type = 'tariff') => ({
    id,
    title: `Action ${id}`,
    action_type: type,
    effective_date: date,
  })

  describe('Empty State', () => {
    it('renders "No dated actions" when actions array is empty', () => {
      render(<TimelineChart actions={[]} onSelectAction={() => {}} />)
      expect(screen.getByText('No dated actions to display')).toBeInTheDocument()
    })

    it('renders "No dated actions" when all actions lack effective_date', () => {
      const actions = [
        { id: '1', title: 'A', action_type: 'tariff', effective_date: null },
        { id: '2', title: 'B', action_type: 'duty', effective_date: undefined },
      ]
      render(<TimelineChart actions={actions} onSelectAction={() => {}} />)
      expect(screen.getByText('No dated actions to display')).toBeInTheDocument()
    })

    it('renders the Timeline heading even in empty state', () => {
      render(<TimelineChart actions={[]} onSelectAction={() => {}} />)
      expect(screen.getByText('Timeline')).toBeInTheDocument()
    })
  })

  describe('Rendering with Actions', () => {
    const actions = [
      makeAction('a1', '2025-03-12', 'tariff'),
      makeAction('a2', '2025-04-01', 'duty'),
      makeAction('a3', '2025-05-15', 'sanction'),
    ]

    it('renders the Timeline heading', () => {
      render(<TimelineChart actions={actions} onSelectAction={() => {}} />)
      expect(screen.getByText('Timeline')).toBeInTheDocument()
    })

    it('renders a button for each dated action', () => {
      render(<TimelineChart actions={actions} onSelectAction={() => {}} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)
    })

    it('sets title attribute with action title and formatted date', () => {
      render(<TimelineChart actions={actions} onSelectAction={() => {}} />)
      const btn = screen.getAllByRole('button')[0]
      // First action sorted by date is a1 (2025-03-12)
      expect(btn.getAttribute('title')).toContain('Action a1')
      expect(btn.getAttribute('title')).toContain('Mar 12, 2025')
    })

    it('calls onSelectAction when a dot is clicked', () => {
      const handler = vi.fn()
      render(<TimelineChart actions={actions} onSelectAction={handler} />)
      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[1])
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) }))
    })
  })

  describe('Filtering Undated Actions', () => {
    it('only renders dots for actions with effective_date', () => {
      const actions = [
        makeAction('dated', '2025-06-01'),
        { id: 'undated', title: 'No date', action_type: 'tariff', effective_date: null },
      ]
      render(<TimelineChart actions={actions} onSelectAction={() => {}} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(1)
    })
  })

  describe('Single Action', () => {
    it('renders correctly with only one dated action', () => {
      const actions = [makeAction('only', '2025-07-04')]
      render(<TimelineChart actions={actions} onSelectAction={() => {}} />)
      expect(screen.getAllByRole('button')).toHaveLength(1)
      expect(screen.queryByText('No dated actions to display')).toBeNull()
    })
  })
})
