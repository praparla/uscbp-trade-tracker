#!/usr/bin/env node
/**
 * Standalone data accuracy checker for trade_actions.json.
 * Run: node src/__tests__/validateData.mjs
 *
 * Cross-references the JSON against known tariff facts from CBP guidance.
 * Exits with code 1 if any critical check fails.
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataPath = join(__dirname, '..', 'data', 'trade_actions.json')
const data = JSON.parse(readFileSync(dataPath, 'utf-8'))

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

function findAction(predicate) {
  return data.actions.find(predicate)
}

function findActions(predicate) {
  return data.actions.filter(predicate)
}

// ─── Structure ───────────────────────────────────────────────────────
console.log('\n\x1b[1m=== Structure Checks ===\x1b[0m')

check('Has meta object', !!data.meta)
check('Has actions array', Array.isArray(data.actions))
check('Has > 0 actions', data.actions.length > 0, `Found ${data.actions.length}`)

const ids = data.actions.map((a) => a.id)
check('No duplicate IDs', new Set(ids).size === ids.length)

const REQUIRED_FIELDS = ['id', 'title', 'summary', 'action_type', 'status', 'countries_affected', 'hs_codes', 'source_url']
for (const field of REQUIRED_FIELDS) {
  const missing = data.actions.filter((a) => a[field] === undefined)
  check(`All actions have "${field}"`, missing.length === 0,
    missing.length > 0 ? `Missing in: ${missing.map((a) => a.id).join(', ')}` : '')
}

// ─── Date Integrity ──────────────────────────────────────────────────
console.log('\n\x1b[1m=== Date Integrity ===\x1b[0m')

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/
const badDates = data.actions.filter(
  (a) => a.effective_date && !ISO_RE.test(a.effective_date)
)
check('All effective_dates are ISO format', badDates.length === 0,
  badDates.map((a) => `${a.id}: "${a.effective_date}"`).join(', '))

const outOfRange = data.actions.filter(
  (a) => a.effective_date && (a.effective_date < '2025-01-01' || a.effective_date > '2026-12-31')
)
check('All dates within 2025-01-01 to 2026-12-31', outOfRange.length === 0,
  outOfRange.map((a) => `${a.id}: ${a.effective_date}`).join(', '))

const badExpiry = data.actions.filter(
  (a) => a.effective_date && a.expiration_date && a.expiration_date <= a.effective_date
)
check('Expiration always after effective', badExpiry.length === 0,
  badExpiry.map((a) => `${a.id}: eff=${a.effective_date} exp=${a.expiration_date}`).join(', '))

// ─── Known Tariff Facts (cross-reference with CBP guidance) ─────────
console.log('\n\x1b[1m=== Known Tariff Fact Checks ===\x1b[0m')

// 1. IEEPA China tariff exists, effective Feb 4, 2025
const ieepaChinaAction = findAction(
  (a) => a.countries_affected.includes('China') && a.title.toLowerCase().includes('ieepa') && a.action_type === 'tariff'
)
check('IEEPA China tariff exists', !!ieepaChinaAction)
if (ieepaChinaAction) {
  check('IEEPA China effective date is 2025-02-04', ieepaChinaAction.effective_date === '2025-02-04',
    `Got: ${ieepaChinaAction.effective_date}`)
}

// 2. IEEPA Canada tariff (reimposed) exists, effective Mar 4, 2025
//    Note: There are multiple Canada IEEPA entries — the initial (Feb 4, superseded)
//    and the reimposed (Mar 4). We specifically want the reimposed one.
const ieepaCanada = findAction(
  (a) => a.countries_affected.includes('Canada') && a.title.toLowerCase().includes('ieepa') &&
         a.action_type === 'tariff' && a.title.toLowerCase().includes('reimposed')
)
check('IEEPA Canada tariff (reimposed) exists', !!ieepaCanada)
if (ieepaCanada) {
  check('IEEPA Canada reimposed effective date is 2025-03-04', ieepaCanada.effective_date === '2025-03-04',
    `Got: ${ieepaCanada.effective_date}`)
}

// 2b. Also verify the initial Canada IEEPA tariff exists and is superseded
const ieepaCanadaInitial = findAction(
  (a) => a.countries_affected.includes('Canada') && a.title.toLowerCase().includes('ieepa') &&
         a.action_type === 'tariff' && a.title.toLowerCase().includes('initial')
)
check('IEEPA Canada initial tariff exists', !!ieepaCanadaInitial)
if (ieepaCanadaInitial) {
  check('IEEPA Canada initial is superseded', ieepaCanadaInitial.status === 'superseded',
    `Got: ${ieepaCanadaInitial.status}`)
}

// 3. IEEPA Mexico tariff exists, effective Mar 4, 2025
const ieepaMexico = findAction(
  (a) => a.countries_affected.includes('Mexico') && a.title.toLowerCase().includes('ieepa') && a.action_type === 'tariff'
)
check('IEEPA Mexico tariff exists', !!ieepaMexico)
if (ieepaMexico) {
  check('IEEPA Mexico effective date is 2025-03-04', ieepaMexico.effective_date === '2025-03-04',
    `Got: ${ieepaMexico.effective_date}`)
}

// 4. Section 232 Steel — effective 2025-03-12
const s232Steel = findAction(
  (a) => a.title.toLowerCase().includes('steel') && a.title.toLowerCase().includes('232') &&
         a.action_type === 'tariff' && a.effective_date === '2025-03-12'
)
check('Section 232 Steel tariff exists', !!s232Steel)
if (s232Steel) {
  check('Section 232 Steel effective date is 2025-03-12', s232Steel.effective_date === '2025-03-12',
    `Got: ${s232Steel.effective_date}`)
  check('Section 232 Steel rate mentions 25%',
    (s232Steel.duty_rate || '').includes('25') || (s232Steel.summary || '').includes('25%'),
    `Rate: ${s232Steel.duty_rate}`)
}

// 5. Section 232 Aluminum — effective 2025-03-12
const s232Aluminum = findAction(
  (a) => a.title.toLowerCase().includes('aluminum') && a.title.toLowerCase().includes('232') &&
         a.action_type === 'tariff' && a.effective_date === '2025-03-12'
)
check('Section 232 Aluminum tariff exists', !!s232Aluminum)
if (s232Aluminum) {
  check('Section 232 Aluminum effective date is 2025-03-12', s232Aluminum.effective_date === '2025-03-12',
    `Got: ${s232Aluminum.effective_date}`)
}

// 6. Section 232 Automobiles — effective 2025-04-03
const s232Autos = findAction(
  (a) => (a.title.toLowerCase().includes('automobile') || a.title.toLowerCase().includes('vehicle')) &&
         a.title.toLowerCase().includes('232') && !a.title.toLowerCase().includes('part') &&
         !a.title.toLowerCase().includes('heavy')
)
check('Section 232 Automobiles tariff exists', !!s232Autos)
if (s232Autos) {
  check('Section 232 Autos effective date is 2025-04-03', s232Autos.effective_date === '2025-04-03',
    `Got: ${s232Autos.effective_date}`)
}

// 7. Reciprocal tariff 10% baseline — effective 2025-04-05
const reciprocal = findAction(
  (a) => a.title.toLowerCase().includes('reciprocal') && a.title.toLowerCase().includes('10%') &&
         a.action_type === 'tariff'
)
check('Reciprocal tariff 10% baseline exists', !!reciprocal)
if (reciprocal) {
  check('Reciprocal tariff effective date is 2025-04-05', reciprocal.effective_date === '2025-04-05',
    `Got: ${reciprocal.effective_date}`)
}

// 8. Section 232 Copper — effective 2025-08-01, 50%
const s232Copper = findAction(
  (a) => a.title.toLowerCase().includes('copper') && a.action_type === 'tariff'
)
check('Section 232 Copper tariff exists', !!s232Copper)
if (s232Copper) {
  check('Section 232 Copper effective date is 2025-08-01', s232Copper.effective_date === '2025-08-01',
    `Got: ${s232Copper.effective_date}`)
  check('Section 232 Copper rate is 50%',
    (s232Copper.duty_rate || '').includes('50') || (s232Copper.summary || '').includes('50%'),
    `Rate: ${s232Copper.duty_rate}`)
}

// 9. Section 232 Timber — effective 2025-10-14
const s232Timber = findAction(
  (a) => a.title.toLowerCase().includes('timber') && a.action_type === 'tariff'
)
check('Section 232 Timber tariff exists', !!s232Timber)
if (s232Timber) {
  check('Section 232 Timber effective date is 2025-10-14', s232Timber.effective_date === '2025-10-14',
    `Got: ${s232Timber.effective_date}`)
}

// 10. Section 232 Semiconductors — effective 2026-01-15
const s232Semi = findAction(
  (a) => a.title.toLowerCase().includes('semiconductor') && a.source_csms_id.includes('67400472')
)
check('Section 232 Semiconductors exists', !!s232Semi)
if (s232Semi) {
  check('Section 232 Semiconductors effective date is 2026-01-15', s232Semi.effective_date === '2026-01-15',
    `Got: ${s232Semi.effective_date}`)
}

// 11. No tariffs should have "All" countries and specific countries simultaneously
const allAndSpecific = data.actions.filter(
  (a) => a.countries_affected.includes('All') && a.countries_affected.length > 1
)
warn('No actions list both "All" and specific countries', allAndSpecific.length === 0,
  allAndSpecific.map((a) => `${a.id}: ${a.countries_affected.join(', ')}`).join('; '))

// 12. Russian sanctions exist
const russiaSanction = findAction(
  (a) => a.countries_affected.includes('Russia') && (a.action_type === 'sanction' || a.action_type === 'embargo')
)
check('Russian sanctions action exists', !!russiaSanction)

// ─── Coverage ────────────────────────────────────────────────────────
console.log('\n\x1b[1m=== Coverage Checks ===\x1b[0m')

const types = new Set(data.actions.map((a) => a.action_type))
check('Multiple action types represented', types.size >= 3, `Types: ${[...types].join(', ')}`)

const countries = new Set()
data.actions.forEach((a) => a.countries_affected.forEach((c) => countries.add(c)))
check('Multiple countries represented', countries.size >= 4, `Countries: ${[...countries].join(', ')}`)

const withHsCodes = data.actions.filter((a) => a.hs_codes.length > 0)
warn('At least 50% of tariffs have HTS codes',
  withHsCodes.length >= data.actions.filter((a) => a.action_type === 'tariff').length * 0.5,
  `${withHsCodes.length} of ${data.actions.filter((a) => a.action_type === 'tariff').length} tariffs have codes`)

const withDutyRate = data.actions.filter((a) => a.duty_rate)
warn('At least 70% of actions have duty_rate',
  withDutyRate.length >= data.actions.length * 0.7,
  `${withDutyRate.length} of ${data.actions.length} have duty_rate`)

// ─── Summary ─────────────────────────────────────────────────────────
console.log('\n\x1b[1m=== Summary ===\x1b[0m')
console.log(`  Total checks: ${passed + failed + warned}`)
console.log(`  \x1b[32mPassed: ${passed}\x1b[0m`)
if (warned > 0) console.log(`  \x1b[33mWarnings: ${warned}\x1b[0m`)
if (failed > 0) console.log(`  \x1b[31mFailed: ${failed}\x1b[0m`)
console.log()

if (failed > 0) {
  console.log('\x1b[31m✗ Data validation failed. Fix the issues above.\x1b[0m')
  process.exit(1)
} else if (warned > 0) {
  console.log('\x1b[33m⚠ Data validation passed with warnings.\x1b[0m')
  process.exit(0)
} else {
  console.log('\x1b[32m✓ All data validation checks passed.\x1b[0m')
  process.exit(0)
}
