import { describe, it, expect } from 'vitest'
import {
  INDUSTRY_SECTORS,
  ACTION_INDUSTRY_MAP,
  INDUSTRY_ESTIMATES,
  getIndustriesForAction,
  getSectorById,
} from '../industryMap'
import tradeData from '../data/trade_actions.json'

// ─── Sector Definitions ──────────────────────────────────────────────

describe('INDUSTRY_SECTORS', () => {
  it('has 8 sectors', () => {
    expect(INDUSTRY_SECTORS).toHaveLength(8)
  })

  it('has unique IDs', () => {
    const ids = INDUSTRY_SECTORS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every sector has required fields', () => {
    for (const sector of INDUSTRY_SECTORS) {
      expect(sector.id).toBeTruthy()
      expect(sector.label).toBeTruthy()
      expect(sector.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(sector.bgColor).toBeTruthy()
      expect(sector.textColor).toBeTruthy()
      expect(sector.description).toBeTruthy()
    }
  })

  it('sectors are in a consistent order', () => {
    const ids = INDUSTRY_SECTORS.map((s) => s.id)
    expect(ids[0]).toBe('primary-metals')
    expect(ids[ids.length - 1]).toBe('compliance')
  })
})

// ─── Action-to-Industry Mapping ──────────────────────────────────────

describe('ACTION_INDUSTRY_MAP', () => {
  const allActionIds = tradeData.actions.map((a) => a.id)
  const mappedIds = Object.keys(ACTION_INDUSTRY_MAP)
  const validSectorIds = INDUSTRY_SECTORS.map((s) => s.id)

  it('maps all 41 trade action IDs', () => {
    expect(mappedIds.length).toBe(41)
  })

  it('every mapped ID exists in trade_actions.json', () => {
    for (const id of mappedIds) {
      expect(allActionIds).toContain(id)
    }
  })

  it('every trade action has a mapping', () => {
    for (const id of allActionIds) {
      expect(mappedIds).toContain(id)
    }
  })

  it('every mapped value is a non-empty array of valid sector IDs', () => {
    for (const [actionId, sectors] of Object.entries(ACTION_INDUSTRY_MAP)) {
      expect(Array.isArray(sectors)).toBe(true)
      expect(sectors.length).toBeGreaterThan(0)
      for (const sectorId of sectors) {
        expect(validSectorIds).toContain(sectorId)
      }
    }
  })

  it('multi-sector mappings are correct', () => {
    expect(ACTION_INDUSTRY_MAP['csms-63577329-s301-4yr-review']).toContain('semiconductors')
    expect(ACTION_INDUSTRY_MAP['csms-63577329-s301-4yr-review']).toContain('consumer-goods')
    expect(ACTION_INDUSTRY_MAP['csms-66151866-annex2-product-exemptions']).toContain('agriculture')
    expect(ACTION_INDUSTRY_MAP['csms-66151866-annex2-product-exemptions']).toContain('consumer-goods')
    expect(ACTION_INDUSTRY_MAP['csms-64297449-ieepa-canada-reimposed']).toContain('energy')
    expect(ACTION_INDUSTRY_MAP['csms-64297449-ieepa-canada-reimposed']).toContain('consumer-goods')
  })

  it('every sector has at least one action mapped to it', () => {
    const sectorCounts = {}
    for (const s of INDUSTRY_SECTORS) sectorCounts[s.id] = 0
    for (const sectors of Object.values(ACTION_INDUSTRY_MAP)) {
      for (const sid of sectors) sectorCounts[sid]++
    }
    for (const [sid, count] of Object.entries(sectorCounts)) {
      expect(count, `Sector ${sid} has no actions`).toBeGreaterThan(0)
    }
  })
})

// ─── getIndustriesForAction ──────────────────────────────────────────

describe('getIndustriesForAction', () => {
  it('returns correct industries for a known action ID', () => {
    const action = tradeData.actions.find((a) => a.id === 'csms-64348411-s232-steel')
    expect(getIndustriesForAction(action)).toEqual(['primary-metals'])
  })

  it('returns multiple industries for multi-mapped action', () => {
    const action = tradeData.actions.find((a) => a.id === 'csms-63577329-s301-4yr-review')
    const industries = getIndustriesForAction(action)
    expect(industries).toContain('semiconductors')
    expect(industries).toContain('consumer-goods')
  })

  it('falls back to keyword matching for unknown ID with matching title', () => {
    const fakeAction = {
      id: 'fake-unknown-action',
      title: 'New Steel Import Restrictions',
      summary: 'Additional duties on steel products',
      federal_authority: 'Section 232',
    }
    expect(getIndustriesForAction(fakeAction)).toEqual(['primary-metals'])
  })

  it('falls back to compliance for completely unknown action', () => {
    const fakeAction = {
      id: 'fake-unknown-action',
      title: 'Administrative Update',
      summary: 'General notice',
      federal_authority: null,
    }
    expect(getIndustriesForAction(fakeAction)).toEqual(['compliance'])
  })

  it('keyword matching is case-insensitive', () => {
    const fakeAction = {
      id: 'fake-unknown',
      title: 'SEMICONDUCTOR DUTY NOTICE',
      summary: '',
      federal_authority: null,
    }
    expect(getIndustriesForAction(fakeAction)).toEqual(['semiconductors'])
  })

  it('matches automotive keywords (vehicle, truck)', () => {
    const fakeAction = {
      id: 'fake-auto',
      title: 'Heavy Truck Import Restrictions',
      summary: '',
      federal_authority: null,
    }
    expect(getIndustriesForAction(fakeAction)).toEqual(['automotive'])
  })

  it('matches energy keywords (petroleum)', () => {
    const fakeAction = {
      id: 'fake-energy',
      title: 'Petroleum Products Duty Notice',
      summary: '',
      federal_authority: null,
    }
    expect(getIndustriesForAction(fakeAction)).toEqual(['energy'])
  })

  it('matches agriculture keywords in summary', () => {
    const fakeAction = {
      id: 'fake-ag',
      title: 'Exemption Notice',
      summary: 'Agricultural products exempt from tariffs',
      federal_authority: null,
    }
    expect(getIndustriesForAction(fakeAction)).toEqual(['agriculture'])
  })

  it('matches luxury-goods keywords (diamond)', () => {
    const fakeAction = {
      id: 'fake-luxury',
      title: 'Diamond Import Ban',
      summary: '',
      federal_authority: null,
    }
    expect(getIndustriesForAction(fakeAction)).toEqual(['luxury-goods'])
  })

  it('matches consumer-goods keywords (reciprocal)', () => {
    const fakeAction = {
      id: 'fake-consumer',
      title: 'Reciprocal Tariff Update',
      summary: '',
      federal_authority: null,
    }
    expect(getIndustriesForAction(fakeAction)).toEqual(['consumer-goods'])
  })
})

// ─── getSectorById ───────────────────────────────────────────────────

describe('getSectorById', () => {
  it('returns sector for valid ID', () => {
    const sector = getSectorById('primary-metals')
    expect(sector).toBeDefined()
    expect(sector.label).toBe('Primary Metals')
  })

  it('returns undefined for invalid ID', () => {
    expect(getSectorById('nonexistent')).toBeUndefined()
  })
})

// ─── Industry Estimates Citation Structure ────────────────────────────

describe('INDUSTRY_ESTIMATES', () => {
  const sectorIds = INDUSTRY_SECTORS.map((s) => s.id)

  it('has an entry for every sector', () => {
    for (const sid of sectorIds) {
      expect(INDUSTRY_ESTIMATES[sid], `Missing estimates for ${sid}`).toBeDefined()
    }
  })

  it('every sector has verified and external arrays', () => {
    for (const sid of sectorIds) {
      const est = INDUSTRY_ESTIMATES[sid]
      expect(Array.isArray(est.verified), `${sid}.verified should be array`).toBe(true)
      expect(Array.isArray(est.external), `${sid}.external should be array`).toBe(true)
    }
  })

  it('every sector has a keyMetric string', () => {
    for (const sid of sectorIds) {
      expect(typeof INDUSTRY_ESTIMATES[sid].keyMetric).toBe('string')
      expect(INDUSTRY_ESTIMATES[sid].keyMetric.length).toBeGreaterThan(0)
    }
  })

  it('every verified claim has claim, value, csms_id, and excerpt fields', () => {
    for (const sid of sectorIds) {
      for (const v of INDUSTRY_ESTIMATES[sid].verified) {
        expect(v.claim, `${sid}: missing claim`).toBeTruthy()
        expect(v.value, `${sid}: missing value`).toBeTruthy()
        // csms_id and excerpt may be null for manually curated data
        expect('csms_id' in v, `${sid}: missing csms_id key`).toBe(true)
        expect('excerpt' in v, `${sid}: missing excerpt key`).toBe(true)
      }
    }
  })

  it('every external claim has claim, value, and source fields', () => {
    for (const sid of sectorIds) {
      for (const ext of INDUSTRY_ESTIMATES[sid].external) {
        expect(ext.claim, `${sid}: missing claim`).toBeTruthy()
        expect(ext.value, `${sid}: missing value`).toBeTruthy()
        expect(ext.source, `${sid}: missing source`).toBeTruthy()
      }
    }
  })

  it('no external claim has a csms_id (should be in verified instead)', () => {
    for (const sid of sectorIds) {
      for (const ext of INDUSTRY_ESTIMATES[sid].external) {
        expect(ext.csms_id, `${sid}: external claim "${ext.claim}" has csms_id`).toBeUndefined()
      }
    }
  })

  it('every external claim with a url links to a .gov domain', () => {
    for (const sid of sectorIds) {
      for (const ext of INDUSTRY_ESTIMATES[sid].external) {
        if (ext.url) {
          expect(ext.url, `${sid}: "${ext.claim}" url must be https`).toMatch(/^https:\/\//)
          expect(ext.url, `${sid}: "${ext.claim}" url must be a .gov domain`).toMatch(/^https:\/\/[^/]*\.gov/)
        }
      }
    }
  })

  it('agriculture verified claims include 237 and 238 counts', () => {
    const agVerified = INDUSTRY_ESTIMATES['agriculture'].verified
    const has237 = agVerified.some((v) => v.value.includes('237'))
    const has238 = agVerified.some((v) => v.value.includes('238'))
    expect(has237).toBe(true)
    expect(has238).toBe(true)
  })

  it('consumer-goods verified claims include 83 countries', () => {
    const cgVerified = INDUSTRY_ESTIMATES['consumer-goods'].verified
    const has83 = cgVerified.some((v) => v.value.includes('83'))
    expect(has83).toBe(true)
  })
})
