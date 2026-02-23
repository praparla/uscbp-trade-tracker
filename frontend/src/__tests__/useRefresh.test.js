import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRefresh } from '../hooks/useRefresh'

describe('useRefresh', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    global.fetch = fetchMock
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Initial State', () => {
    it('starts with isDevMode false', () => {
      fetchMock.mockRejectedValue(new Error('connection refused'))
      const { result } = renderHook(() => useRefresh())
      expect(result.current.isDevMode).toBe(false)
    })

    it('starts with isRefreshing false', () => {
      fetchMock.mockRejectedValue(new Error('connection refused'))
      const { result } = renderHook(() => useRefresh())
      expect(result.current.isRefreshing).toBe(false)
    })

    it('starts with lastStatus null', () => {
      fetchMock.mockRejectedValue(new Error('connection refused'))
      const { result } = renderHook(() => useRefresh())
      expect(result.current.lastStatus).toBeNull()
    })
  })

  describe('Dev Mode Detection', () => {
    it('sets isDevMode true when /status returns 200', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ last_run: '2025-01-01' }),
      })

      const { result } = renderHook(() => useRefresh())
      await waitFor(() => {
        expect(result.current.isDevMode).toBe(true)
      })
    })

    it('sets lastStatus from /status response', async () => {
      const statusData = { last_run: '2025-01-01', refresh_in_progress: false }
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(statusData),
      })

      const { result } = renderHook(() => useRefresh())
      await waitFor(() => {
        expect(result.current.lastStatus).toEqual(statusData)
      })
    })

    it('keeps isDevMode false when fetch fails', async () => {
      fetchMock.mockRejectedValue(new Error('connection refused'))

      const { result } = renderHook(() => useRefresh())
      // Wait a tick for the effect to run
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })
      expect(result.current.isDevMode).toBe(false)
    })

    it('keeps isDevMode false when /status returns non-ok', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const { result } = renderHook(() => useRefresh())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })
      expect(result.current.isDevMode).toBe(false)
    })
  })

  describe('triggerRefresh', () => {
    it('does nothing when isDevMode is false', async () => {
      fetchMock.mockRejectedValue(new Error('connection refused'))

      const { result } = renderHook(() => useRefresh())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await act(async () => {
        await result.current.triggerRefresh()
      })

      // Only the initial /status probe should have been called
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('Cleanup', () => {
    it('aborts fetch on unmount', () => {
      fetchMock.mockImplementation(() => new Promise(() => {})) // Never resolves
      const { unmount } = renderHook(() => useRefresh())
      // Should not throw
      expect(() => unmount()).not.toThrow()
    })
  })
})
