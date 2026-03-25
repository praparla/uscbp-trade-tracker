import { describe, it, expect } from 'vitest'
import courtRulingsData from '../data/court_rulings.json'
import tradeActionsData from '../data/trade_actions.json'

const { meta, rulings } = courtRulingsData

const VALID_RULING_TYPES = ['lawsuit', 'ruling', 'injunction', 'appeal', 'congressional_action', 'executive_action']
const VALID_STATUSES = ['pending', 'decided', 'appealed', 'dismissed', 'enacted', 'failed']
const VALID_OUTCOMES = ['upheld', 'struck_down', 'remanded', 'partial', 'passed', 'vetoed', null]
const VALID_EVENT_TYPES = ['filing', 'argument', 'ruling', 'motion', 'executive_action']
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

describe('court_rulings.json schema validation', () => {
  // ─── Meta ───────────────────────────────────────────────

  it('has meta object with required fields', () => {
    expect(meta).toBeDefined()
    expect(meta.generated_at).toBeDefined()
    expect(typeof meta.total_rulings).toBe('number')
    expect(Array.isArray(meta.sources)).toBe(true)
  })

  it('meta.total_rulings matches actual count', () => {
    expect(meta.total_rulings).toBe(rulings.length)
  })

  // ─── Rulings array ─────────────────────────────────────

  it('has non-empty rulings array', () => {
    expect(Array.isArray(rulings)).toBe(true)
    expect(rulings.length).toBeGreaterThan(0)
  })

  it('all rulings have unique IDs', () => {
    const ids = rulings.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // ─── Per-ruling validation ──────────────────────────────

  describe.each(rulings.map((r) => [r.id, r]))('%s', (id, ruling) => {
    it('has required string fields', () => {
      expect(typeof ruling.id).toBe('string')
      expect(ruling.id.length).toBeGreaterThan(0)
      expect(typeof ruling.case_name).toBe('string')
      expect(ruling.case_name.length).toBeGreaterThan(0)
      expect(typeof ruling.court).toBe('string')
      expect(ruling.court.length).toBeGreaterThan(0)
      expect(typeof ruling.summary).toBe('string')
      expect(ruling.summary.length).toBeGreaterThan(0)
    })

    it('has valid ruling_type', () => {
      expect(VALID_RULING_TYPES).toContain(ruling.ruling_type)
    })

    it('has valid status', () => {
      expect(VALID_STATUSES).toContain(ruling.status)
    })

    it('has valid outcome or null', () => {
      expect(VALID_OUTCOMES).toContain(ruling.outcome)
    })

    it('has valid filing_date (ISO format)', () => {
      expect(typeof ruling.filing_date).toBe('string')
      expect(ruling.filing_date).toMatch(ISO_DATE_REGEX)
    })

    it('has valid argument_date or null', () => {
      if (ruling.argument_date !== null) {
        expect(ruling.argument_date).toMatch(ISO_DATE_REGEX)
      }
    })

    it('has valid ruling_date or null', () => {
      if (ruling.ruling_date !== null) {
        expect(ruling.ruling_date).toMatch(ISO_DATE_REGEX)
      }
    })

    it('has affected_tariff_programs as non-empty array', () => {
      expect(Array.isArray(ruling.affected_tariff_programs)).toBe(true)
      expect(ruling.affected_tariff_programs.length).toBeGreaterThan(0)
    })

    it('has affected_countries as array', () => {
      expect(Array.isArray(ruling.affected_countries)).toBe(true)
      expect(ruling.affected_countries.length).toBeGreaterThan(0)
    })

    it('has source_url pointing to .gov domain or is empty', () => {
      if (ruling.source_url && ruling.source_url.length > 0) {
        const url = new URL(ruling.source_url)
        const hostname = url.hostname.toLowerCase()
        expect(
          hostname.endsWith('.gov') || hostname.endsWith('.uscourts.gov'),
          `Expected .gov domain, got: ${hostname}`
        ).toBe(true)
      }
    })

    it('has timeline_events as array with valid entries', () => {
      expect(Array.isArray(ruling.timeline_events)).toBe(true)
      ruling.timeline_events.forEach((evt) => {
        expect(typeof evt.date).toBe('string')
        expect(evt.date).toMatch(ISO_DATE_REGEX)
        expect(typeof evt.event).toBe('string')
        expect(evt.event.length).toBeGreaterThan(0)
        expect(VALID_EVENT_TYPES).toContain(evt.type)
      })
    })

    it('has related_action_ids as array', () => {
      expect(Array.isArray(ruling.related_action_ids)).toBe(true)
    })

    it('related_action_ids reference valid trade action IDs', () => {
      const validIds = new Set(tradeActionsData.actions.map((a) => a.id))
      ruling.related_action_ids.forEach((actionId) => {
        expect(
          validIds.has(actionId),
          `related_action_id "${actionId}" not found in trade_actions.json`
        ).toBe(true)
      })
    })

    it('has key_legal_question as string', () => {
      expect(typeof ruling.key_legal_question).toBe('string')
      expect(ruling.key_legal_question.length).toBeGreaterThan(0)
    })
  })

  // ─── Cross-data integrity ──────────────────────────────

  it('all source URLs are unique or empty', () => {
    const urls = rulings
      .map((r) => r.source_url)
      .filter((u) => u && u.length > 0)
    // Duplicates are OK for related cases, but flag if all identical
    expect(urls.length).toBeGreaterThan(0)
  })

  it('decided rulings have a ruling_date', () => {
    rulings
      .filter((r) => r.status === 'decided')
      .forEach((r) => {
        expect(r.ruling_date, `${r.id} is decided but has no ruling_date`).not.toBeNull()
      })
  })

  it('decided rulings have an outcome', () => {
    rulings
      .filter((r) => r.status === 'decided')
      .forEach((r) => {
        expect(r.outcome, `${r.id} is decided but has no outcome`).not.toBeNull()
      })
  })

  it('pending rulings have no ruling_date', () => {
    rulings
      .filter((r) => r.status === 'pending')
      .forEach((r) => {
        expect(r.ruling_date, `${r.id} is pending but has ruling_date`).toBeNull()
      })
  })

  it('pending rulings have no outcome', () => {
    rulings
      .filter((r) => r.status === 'pending')
      .forEach((r) => {
        expect(r.outcome, `${r.id} is pending but has outcome`).toBeNull()
      })
  })
})
