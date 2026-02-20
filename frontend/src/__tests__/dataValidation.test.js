import { describe, it, expect } from 'vitest'
import tradeData from '../data/trade_actions.json'
import { ACTION_TYPE_COLORS } from '../constants'

const VALID_ACTION_TYPES = Object.keys(ACTION_TYPE_COLORS)
const VALID_STATUSES = ['active', 'expired', 'pending', 'superseded']
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const DATE_RANGE_START = '2025-01-01'
const DATE_RANGE_END = '2026-12-31'

describe('trade_actions.json — top-level structure', () => {
  it('has a meta object', () => {
    expect(tradeData).toHaveProperty('meta')
    expect(typeof tradeData.meta).toBe('object')
  })

  it('has an actions array', () => {
    expect(tradeData).toHaveProperty('actions')
    expect(Array.isArray(tradeData.actions)).toBe(true)
  })

  it('actions array is not empty', () => {
    expect(tradeData.actions.length).toBeGreaterThan(0)
  })
})

describe('trade_actions.json — meta validation', () => {
  const { meta } = tradeData

  it('has generated_at timestamp', () => {
    expect(meta.generated_at).toBeTruthy()
  })

  it('has date_range_start and date_range_end', () => {
    expect(meta.date_range_start).toMatch(ISO_DATE_REGEX)
    expect(meta.date_range_end).toMatch(ISO_DATE_REGEX)
    expect(meta.date_range_start < meta.date_range_end).toBe(true)
  })

  it('has scraper_version', () => {
    expect(meta.scraper_version).toBeTruthy()
  })

  it('max_pdfs_cap is a non-negative number', () => {
    expect(typeof meta.max_pdfs_cap).toBe('number')
    expect(meta.max_pdfs_cap).toBeGreaterThanOrEqual(0)
  })

  it('errors is an array', () => {
    expect(Array.isArray(meta.errors)).toBe(true)
  })
})

describe('trade_actions.json — action schema validation', () => {
  tradeData.actions.forEach((action, i) => {
    describe(`action[${i}]: "${action.title?.slice(0, 50)}"`, () => {
      it('has a non-empty id', () => {
        expect(action.id).toBeTruthy()
        expect(typeof action.id).toBe('string')
      })

      it('has a non-empty title', () => {
        expect(action.title).toBeTruthy()
        expect(typeof action.title).toBe('string')
        expect(action.title.length).toBeGreaterThan(5)
      })

      it('has a non-empty summary', () => {
        expect(action.summary).toBeTruthy()
        expect(typeof action.summary).toBe('string')
        expect(action.summary.length).toBeGreaterThan(10)
      })

      it('has a valid action_type', () => {
        expect(VALID_ACTION_TYPES).toContain(action.action_type)
      })

      it('has a valid status', () => {
        expect(VALID_STATUSES).toContain(action.status)
      })

      it('has countries_affected as a non-empty array of strings', () => {
        expect(Array.isArray(action.countries_affected)).toBe(true)
        expect(action.countries_affected.length).toBeGreaterThan(0)
        action.countries_affected.forEach((c) => {
          expect(typeof c).toBe('string')
          expect(c.length).toBeGreaterThan(0)
        })
      })

      it('has hs_codes as an array of strings', () => {
        expect(Array.isArray(action.hs_codes)).toBe(true)
        action.hs_codes.forEach((code) => {
          expect(typeof code).toBe('string')
        })
      })

      it('has effective_date as a valid ISO date or null', () => {
        if (action.effective_date !== null) {
          expect(action.effective_date).toMatch(ISO_DATE_REGEX)
          // Verify it parses to a real date
          const d = new Date(action.effective_date)
          expect(d.toString()).not.toBe('Invalid Date')
        }
      })

      it('has expiration_date as a valid ISO date or null', () => {
        if (action.expiration_date !== null) {
          expect(action.expiration_date).toMatch(ISO_DATE_REGEX)
          const d = new Date(action.expiration_date)
          expect(d.toString()).not.toBe('Invalid Date')
        }
      })

      it('effective_date is within the expected range', () => {
        if (action.effective_date) {
          expect(action.effective_date >= DATE_RANGE_START).toBe(true)
          expect(action.effective_date <= DATE_RANGE_END).toBe(true)
        }
      })

      it('expiration_date is after effective_date when both present', () => {
        if (action.effective_date && action.expiration_date) {
          expect(action.expiration_date > action.effective_date).toBe(true)
        }
      })

      it('has source_csms_id', () => {
        expect(action.source_csms_id).toBeTruthy()
        expect(typeof action.source_csms_id).toBe('string')
      })

      it('has source_url as a string (URL or empty for manually curated entries)', () => {
        expect(typeof action.source_url).toBe('string')
        // If source_url is non-empty, it must be a valid URL
        if (action.source_url) {
          expect(action.source_url).toMatch(/^https?:\/\//)
        }
      })

      it('raw_excerpt is 200 chars or fewer', () => {
        if (action.raw_excerpt) {
          expect(action.raw_excerpt.length).toBeLessThanOrEqual(200)
        }
      })
    })
  })
})

describe('trade_actions.json — cross-entry integrity', () => {
  it('has no duplicate IDs', () => {
    const ids = tradeData.actions.map((a) => a.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('all action_types have a color mapping in constants', () => {
    const types = new Set(tradeData.actions.map((a) => a.action_type))
    types.forEach((t) => {
      expect(ACTION_TYPE_COLORS).toHaveProperty(t)
    })
  })

  it('actions are reasonably distributed (not all one type)', () => {
    const types = new Set(tradeData.actions.map((a) => a.action_type))
    expect(types.size).toBeGreaterThan(1)
  })

  it('at least some actions are status=active', () => {
    const active = tradeData.actions.filter((a) => a.status === 'active')
    expect(active.length).toBeGreaterThan(0)
  })

  it('country names are reasonable (no empty strings, no obvious typos)', () => {
    const countries = new Set()
    tradeData.actions.forEach((a) => {
      a.countries_affected.forEach((c) => countries.add(c))
    })
    countries.forEach((c) => {
      expect(c.length).toBeGreaterThan(1)
      // Should start with a capital letter
      expect(c[0]).toBe(c[0].toUpperCase())
    })
  })

  it('at least some actions have source_url populated', () => {
    const withUrl = tradeData.actions.filter((a) => a.source_url)
    // At minimum, the known GovDelivery URLs and CBP guidance pages should have URLs
    expect(withUrl.length).toBeGreaterThan(5)
  })

  it('multiple statuses are represented', () => {
    const statuses = new Set(tradeData.actions.map((a) => a.status))
    expect(statuses.size).toBeGreaterThan(1)
  })

  it('meta.cost_optimization has required fields', () => {
    const co = tradeData.meta.cost_optimization
    if (co) {
      expect(typeof co.prefilter_enabled).toBe('boolean')
      expect(typeof co.truncation_enabled).toBe('boolean')
      expect(typeof co.model_used).toBe('string')
      expect(typeof co.estimated_cost_usd).toBe('number')
    }
  })
})
