import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  INDUSTRY_SECTORS,
  ACTION_INDUSTRY_MAP,
  INDUSTRY_ESTIMATES,
} from '../industryMap'
import tradeData from '../data/trade_actions.json'

const __dirname = dirname(fileURLToPath(import.meta.url))
const textsDir = join(__dirname, '..', '..', '..', 'scraper', 'cache', 'texts')

// ─── Verified Claims (Tier 1) ─────────────────────────────────────

describe('Industry Citation Traceability', () => {
  const sectorIds = INDUSTRY_SECTORS.map((s) => s.id)

  describe('Verified claims (Tier 1)', () => {
    for (const sid of sectorIds) {
      const est = INDUSTRY_ESTIMATES[sid]
      if (!est || est.verified.length === 0) continue

      for (const v of est.verified) {
        if (!v.csms_id) continue

        it(`${sid}: cached text file exists for CSMS #${v.csms_id}`, () => {
          const textFile = join(textsDir, `csms_${v.csms_id}.txt`)
          expect(existsSync(textFile), `Missing: ${textFile}`).toBe(true)
        })

        if (v.excerpt) {
          it(`${sid}: excerpt "${v.excerpt.substring(0, 40)}..." found in CSMS #${v.csms_id}`, () => {
            const textFile = join(textsDir, `csms_${v.csms_id}.txt`)
            if (!existsSync(textFile)) return // already caught above
            const content = readFileSync(textFile, 'utf-8').toLowerCase()
            expect(content).toContain(v.excerpt.toLowerCase())
          })
        }
      }
    }

    it('no verified claim is missing both csms_id and excerpt', () => {
      for (const sid of sectorIds) {
        const est = INDUSTRY_ESTIMATES[sid]
        if (!est) continue
        for (const v of est.verified) {
          // Claims with csms_id should also have excerpt (or both can be null for manual data)
          if (v.csms_id) {
            expect(v.excerpt, `${sid}: claim "${v.claim}" has csms_id but no excerpt`).toBeTruthy()
          }
        }
      }
    })
  })

  // ─── External Claims (Tier 2) ───────────────────────────────────

  describe('External claims (Tier 2)', () => {
    it('every external claim has a source attribution', () => {
      for (const sid of sectorIds) {
        const est = INDUSTRY_ESTIMATES[sid]
        if (!est) continue
        for (const ext of est.external) {
          expect(ext.source, `${sid}: external claim "${ext.claim}" missing source`).toBeTruthy()
        }
      }
    })

    it('no external claim pretends to be verified (no csms_id)', () => {
      for (const sid of sectorIds) {
        const est = INDUSTRY_ESTIMATES[sid]
        if (!est) continue
        for (const ext of est.external) {
          expect(ext.csms_id, `${sid}: external claim "${ext.claim}" has csms_id`).toBeUndefined()
        }
      }
    })
  })

  // ─── Mapping Coverage ───────────────────────────────────────────

  describe('Mapping coverage', () => {
    const allActionIds = tradeData.actions.map((a) => a.id)
    const mappedIds = Object.keys(ACTION_INDUSTRY_MAP)

    it('every action ID in ACTION_INDUSTRY_MAP exists in trade_actions.json', () => {
      const stale = mappedIds.filter((id) => !allActionIds.includes(id))
      expect(stale, `Stale mappings: ${stale.join(', ')}`).toHaveLength(0)
    })

    it('every trade action has at least one industry mapping', () => {
      const orphans = allActionIds.filter((id) => !mappedIds.includes(id))
      expect(orphans, `Unmapped actions: ${orphans.join(', ')}`).toHaveLength(0)
    })

    it('all sector IDs in mappings are valid', () => {
      const validIds = INDUSTRY_SECTORS.map((s) => s.id)
      const allMapped = Object.values(ACTION_INDUSTRY_MAP).flat()
      const invalid = [...new Set(allMapped.filter((sid) => !validIds.includes(sid)))]
      expect(invalid, `Invalid sector IDs: ${invalid.join(', ')}`).toHaveLength(0)
    })
  })

  // ─── Data Consistency ───────────────────────────────────────────

  describe('Data consistency', () => {
    it('agriculture verified claims include 237 and 238 exemption counts', () => {
      const agVerified = INDUSTRY_ESTIMATES['agriculture'].verified
      expect(agVerified.some((v) => v.value.includes('237'))).toBe(true)
      expect(agVerified.some((v) => v.value.includes('238'))).toBe(true)
    })

    it('consumer-goods verified claims include 83 countries', () => {
      const cgVerified = INDUSTRY_ESTIMATES['consumer-goods'].verified
      expect(cgVerified.some((v) => v.value.includes('83'))).toBe(true)
    })

    it('consumer-goods verified claims include 178 S301 exclusions', () => {
      const cgVerified = INDUSTRY_ESTIMATES['consumer-goods'].verified
      expect(cgVerified.some((v) => v.value.includes('178'))).toBe(true)
    })

    it('every sector has a keyMetric string', () => {
      for (const sid of INDUSTRY_SECTORS.map((s) => s.id)) {
        expect(typeof INDUSTRY_ESTIMATES[sid].keyMetric).toBe('string')
        expect(INDUSTRY_ESTIMATES[sid].keyMetric.length).toBeGreaterThan(0)
      }
    })
  })
})
