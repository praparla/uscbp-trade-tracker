#!/usr/bin/env node
/**
 * Citation traceability audit for industry sector data.
 * Run: node src/__tests__/validateIndustryCitations.mjs
 *
 * Validates that every verified claim in INDUSTRY_ESTIMATES can be traced
 * back to a cached CSMS bulletin text file, and that the cited excerpt
 * actually appears in that file.
 *
 * Exit code 1 if any verified claim fails traceability.
 * Exit code 0 (with warnings) for external estimates.
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Import data
const dataPath = join(__dirname, '..', 'data', 'trade_actions.json')
const data = JSON.parse(readFileSync(dataPath, 'utf-8'))

// Import industry map (we read the JS source and evaluate exports)
// Since this is an ESM script, we can dynamic import
const industryMapPath = join(__dirname, '..', 'industryMap.js')
const {
  INDUSTRY_SECTORS,
  ACTION_INDUSTRY_MAP,
  INDUSTRY_ESTIMATES,
} = await import(industryMapPath)

const textsDir = join(__dirname, '..', '..', '..', 'scraper', 'cache', 'texts')

let passed = 0
let failed = 0
let warned = 0

function check(name, condition, detail) {
  if (condition) {
    passed++
    console.log(`  \x1b[32m✓\x1b[0m ${name}`)
  } else {
    failed++
    console.log(`  \x1b[31m✗ FAIL:\x1b[0m ${name}`)
    if (detail) console.log(`         ${detail}`)
  }
}

function warn(name, condition, detail) {
  if (condition) {
    passed++
    console.log(`  \x1b[32m✓\x1b[0m ${name}`)
  } else {
    warned++
    console.log(`  \x1b[33m⚠ WARN:\x1b[0m ${name}`)
    if (detail) console.log(`         ${detail}`)
  }
}

// ─── Citation Traceability Audit ──────────────────────────────────
console.log('\n\x1b[1m=== Citation Traceability Audit ===\x1b[0m')

const sectorIds = INDUSTRY_SECTORS.map((s) => s.id)

for (const sid of sectorIds) {
  const est = INDUSTRY_ESTIMATES[sid]
  if (!est) {
    check(`${sid}: has estimates entry`, false, 'Missing INDUSTRY_ESTIMATES entry')
    continue
  }

  // Verified claims (Tier 1)
  for (const v of est.verified) {
    if (!v.csms_id) {
      warn(`${sid}: verified claim "${v.claim}" has csms_id`, false,
        'Null csms_id — manually curated, not PDF-traceable')
      continue
    }

    const textFile = join(textsDir, `csms_${v.csms_id}.txt`)
    const fileExists = existsSync(textFile)
    check(`${sid}: cached text exists for CSMS #${v.csms_id}`, fileExists,
      `Expected: ${textFile}`)

    if (fileExists && v.excerpt) {
      const content = readFileSync(textFile, 'utf-8').toLowerCase()
      const excerptLower = v.excerpt.toLowerCase()
      const found = content.includes(excerptLower)
      check(`${sid}: excerpt found in CSMS #${v.csms_id} — "${v.excerpt.substring(0, 50)}..."`,
        found,
        found ? '' : `Excerpt not found in file content`)
    }
  }

  // External claims (Tier 2)
  for (const ext of est.external) {
    warn(`${sid}: external "${ext.claim}" has source attribution`,
      !!ext.source,
      'External estimate missing source')
  }
}

// ─── Mapping Coverage Audit ───────────────────────────────────────
console.log('\n\x1b[1m=== Mapping Coverage Audit ===\x1b[0m')

const allActionIds = data.actions.map((a) => a.id)
const mappedIds = Object.keys(ACTION_INDUSTRY_MAP)
const validSectorIds = INDUSTRY_SECTORS.map((s) => s.id)

check('ACTION_INDUSTRY_MAP covers all trade actions',
  allActionIds.every((id) => mappedIds.includes(id)),
  (() => {
    const orphans = allActionIds.filter((id) => !mappedIds.includes(id))
    return orphans.length > 0 ? `Unmapped: ${orphans.join(', ')}` : ''
  })())

check('Every mapped ID exists in trade_actions.json',
  mappedIds.every((id) => allActionIds.includes(id)),
  (() => {
    const stale = mappedIds.filter((id) => !allActionIds.includes(id))
    return stale.length > 0 ? `Stale mappings: ${stale.join(', ')}` : ''
  })())

check('All sector IDs in mappings are valid',
  Object.values(ACTION_INDUSTRY_MAP).flat().every((sid) => validSectorIds.includes(sid)),
  (() => {
    const invalid = [...new Set(Object.values(ACTION_INDUSTRY_MAP).flat().filter((sid) => !validSectorIds.includes(sid)))]
    return invalid.length > 0 ? `Invalid sector IDs: ${invalid.join(', ')}` : ''
  })())

check('Every sector has at least one mapped action',
  (() => {
    const sectorCounts = {}
    for (const s of INDUSTRY_SECTORS) sectorCounts[s.id] = 0
    for (const sectors of Object.values(ACTION_INDUSTRY_MAP)) {
      for (const sid of sectors) sectorCounts[sid]++
    }
    return Object.values(sectorCounts).every((c) => c > 0)
  })(),
  (() => {
    const sectorCounts = {}
    for (const s of INDUSTRY_SECTORS) sectorCounts[s.id] = 0
    for (const sectors of Object.values(ACTION_INDUSTRY_MAP)) {
      for (const sid of sectors) sectorCounts[sid]++
    }
    const empty = Object.entries(sectorCounts).filter(([, c]) => c === 0).map(([id]) => id)
    return empty.length > 0 ? `Empty sectors: ${empty.join(', ')}` : ''
  })())

// ─── Data Consistency Audit ───────────────────────────────────────
console.log('\n\x1b[1m=== Data Consistency Audit ===\x1b[0m')

// Ag exemption counts: 237 + 238
const agEst = INDUSTRY_ESTIMATES['agriculture']
if (agEst) {
  const has237 = agEst.verified.some((v) => v.value.includes('237'))
  const has238 = agEst.verified.some((v) => v.value.includes('238'))
  check('Agriculture verified includes 237 exemptions', has237)
  check('Agriculture verified includes 238 exemptions', has238)
}

// Consumer goods: 83 countries
const cgEst = INDUSTRY_ESTIMATES['consumer-goods']
if (cgEst) {
  const has83 = cgEst.verified.some((v) => v.value.includes('83'))
  check('Consumer goods verified includes 83 countries', has83)
}

// S301 exclusions: 178 products
if (cgEst) {
  const has178 = cgEst.verified.some((v) => v.value.includes('178'))
  check('Consumer goods verified includes 178 S301 exclusions', has178)
}

// ─── Summary ─────────────────────────────────────────────────────
console.log('\n\x1b[1m=== Summary ===\x1b[0m')
console.log(`  Total checks: ${passed + failed + warned}`)
console.log(`  \x1b[32mPassed: ${passed}\x1b[0m`)
if (warned > 0) console.log(`  \x1b[33mWarnings: ${warned}\x1b[0m`)
if (failed > 0) console.log(`  \x1b[31mFailed: ${failed}\x1b[0m`)
console.log()

if (failed > 0) {
  console.log('\x1b[31m✗ Citation validation failed. Fix the issues above.\x1b[0m')
  process.exit(1)
} else if (warned > 0) {
  console.log('\x1b[33m⚠ Citation validation passed with warnings.\x1b[0m')
  process.exit(0)
} else {
  console.log('\x1b[32m✓ All citation checks passed.\x1b[0m')
  process.exit(0)
}
