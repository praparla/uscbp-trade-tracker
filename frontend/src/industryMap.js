/**
 * Industry sector mapping for trade actions.
 *
 * Maps each trade action to one or more industry sectors, with curated
 * quantitative context. Every data point is classified as:
 *   - Verified (Tier 1): Directly from cached CSMS bulletin texts, with csms_id + excerpt
 *   - External (Tier 2): From public policy analysis, with source attribution
 *
 * Traceability chain for verified claims:
 *   Source PDF → CSMS entry (manifest.json) → GovDelivery page → cached text
 *   File: scraper/cache/texts/csms_{csms_id}.txt → excerpt searchable in content
 */

// -- Sector Definitions --

export const INDUSTRY_SECTORS = [
  {
    id: 'primary-metals',
    label: 'Primary Metals',
    color: '#6366f1',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    description: 'Steel, aluminum, copper, and timber tariffs under Section 232.',
  },
  {
    id: 'automotive',
    label: 'Automotive',
    color: '#ef4444',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    description: 'Vehicles, auto parts, trucks, and buses under Section 232.',
  },
  {
    id: 'semiconductors',
    label: 'Semiconductors & Electronics',
    color: '#8b5cf6',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    description: 'Semiconductor imports under Section 232 and Section 301.',
  },
  {
    id: 'agriculture',
    label: 'Agriculture',
    color: '#22c55e',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    description: 'Agricultural exemptions from reciprocal and country-specific tariffs.',
  },
  {
    id: 'energy',
    label: 'Energy',
    color: '#f59e0b',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    description: 'Canadian energy resources, Mexico potash, and energy product lists.',
  },
  {
    id: 'consumer-goods',
    label: 'Consumer Goods',
    color: '#3b82f6',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    description: 'Broad reciprocal tariffs and country-specific IEEPA duties.',
  },
  {
    id: 'luxury-goods',
    label: 'Luxury Goods',
    color: '#ec4899',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    description: 'Sanctions on Russian diamonds and high-value goods.',
  },
  {
    id: 'compliance',
    label: 'Cross-Sector / Compliance',
    color: '#6b7280',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    description: 'Stacking rules, tariff modifications, and compliance guidance.',
  },
]

// -- Action-to-Industry Mapping --
// Each action ID maps to an array of sector IDs (supports multi-sector).

export const ACTION_INDUSTRY_MAP = {
  // PRIMARY METALS
  'csms-64348411-s232-steel':          ['primary-metals'],
  'csms-64348288-s232-aluminum':       ['primary-metals'],
  'csms-65794272-s232-copper':         ['primary-metals'],
  'csms-66492057-s232-timber':         ['primary-metals'],
  'csms-65441222-s232-steel-deriv':    ['primary-metals'],

  // AUTOMOTIVE
  'csms-64624801-s232-autos':          ['automotive'],
  'csms-64913145-s232-autoparts':      ['automotive'],
  'csms-s232-mhdv':                    ['automotive'],
  'csms-65475228-uk-auto-trq':         ['automotive'],

  // SEMICONDUCTORS & ELECTRONICS
  'csms-67400472-s232-semiconductors': ['semiconductors'],
  'csms-s301-semiconductor':           ['semiconductors'],
  'csms-63577329-s301-4yr-review':     ['semiconductors', 'consumer-goods'],

  // AGRICULTURE
  'csms-66814923-ag-exemption-reciprocal': ['agriculture'],
  'csms-66871909-ag-exemption-brazil':     ['agriculture'],
  'csms-66151866-annex2-product-exemptions': ['agriculture', 'consumer-goods'],

  // ENERGY
  'csms-65054354-canada-energy-list-update': ['energy'],
  'csms-64335789-mexico-usmca-potash':      ['energy'],
  'csms-64297449-ieepa-canada-reimposed':   ['energy', 'consumer-goods'],
  'csms-65798609-canada-duty-increase-35pct': ['energy', 'consumer-goods'],

  // CONSUMER GOODS
  'csms-63988467-ieepa-canada-initial':       ['consumer-goods'],
  'csms-63988468-ieepa-china-initial':        ['consumer-goods'],
  'csms-64297292-ieepa-mexico':               ['consumer-goods'],
  'csms-64299816-china-duty-increase-20pct':  ['consumer-goods'],
  'csms-64649265-reciprocal-baseline':        ['consumer-goods'],
  'csms-64680374-reciprocal-country-specific': ['consumer-goods'],
  'csms-64687696-china-reciprocal-84pct':     ['consumer-goods'],
  'csms-65029337-china-reciprocal-reduced-10pct': ['consumer-goods'],
  'csms-65807735-ieepa-brazil':               ['consumer-goods'],
  'csms-65829726-reciprocal-bespoke-reimposed': ['consumer-goods'],
  'csms-66027027-ieepa-india':                ['consumer-goods'],
  'csms-66749380-china-tariff-update-nov2025': ['consumer-goods'],
  'csms-65894387-china-reciprocal-extended-nov10': ['consumer-goods'],
  'csms-65573545-bespoke-rates-suspended-aug1': ['consumer-goods'],
  'csms-66336270-tariff-swiss':               ['consumer-goods'],

  // LUXURY GOODS
  'csms-sanctions-russia':                    ['luxury-goods'],

  // CROSS-SECTOR / COMPLIANCE
  'csms-63991510-canada-pause':               ['compliance'],
  'csms-64235342-china-compliance':           ['compliance'],
  'csms-65054270-eo14289-stacking':           ['compliance'],
  'csms-65201773-intransit-extension':        ['compliance'],
  'csms-66427144-s301-vessel':                ['compliance'],
  'csms-66077997-s301-exclusions':            ['compliance', 'consumer-goods'],
}

// -- Keyword Fallback (for future scraper-generated actions not in the map) --

const INDUSTRY_KEYWORDS = [
  { id: 'primary-metals', patterns: ['steel', 'aluminum', 'copper', 'timber', 'lumber'] },
  { id: 'automotive',     patterns: ['auto', 'vehicle', 'truck', 'bus', 'mhdv'] },
  { id: 'semiconductors', patterns: ['semiconductor', 'chip', 'wafer', 'polysilicon'] },
  { id: 'agriculture',    patterns: ['agriculture', 'agricultural', 'farm', 'crop'] },
  { id: 'energy',         patterns: ['energy', 'petroleum', 'potash', 'oil', 'natural gas'] },
  { id: 'luxury-goods',   patterns: ['diamond', 'luxury', 'jewelry'] },
  { id: 'consumer-goods', patterns: ['reciprocal', 'ieepa', 'all products', 'all imports'] },
]

/**
 * Returns an array of industry sector IDs for a given trade action.
 * Uses ID-based mapping first, then keyword fallback, then ['compliance'] default.
 */
export function getIndustriesForAction(action) {
  if (ACTION_INDUSTRY_MAP[action.id]) {
    return ACTION_INDUSTRY_MAP[action.id]
  }

  const searchText = [action.title, action.summary, action.federal_authority]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  for (const { id, patterns } of INDUSTRY_KEYWORDS) {
    if (patterns.some((p) => searchText.includes(p))) {
      return [id]
    }
  }

  return ['compliance']
}

/**
 * Returns a sector object by its ID, or undefined if not found.
 */
export function getSectorById(sectorId) {
  return INDUSTRY_SECTORS.find((s) => s.id === sectorId)
}

// -- Curated Sector Estimates with Citations --
// verified[]: Tier 1 — from CSMS bulletin texts (csms_id + excerpt for audit)
// external[]: Tier 2 — from public policy analysis (source attribution, not from CBP PDFs)

export const INDUSTRY_ESTIMATES = {
  'primary-metals': {
    verified: [
      { claim: 'Steel tariff rate', value: '25%', csms_id: '64348411',
        excerpt: '25 percent import duty on all imports of steel articles' },
      { claim: 'Aluminum tariff rate', value: '25%', csms_id: '64348288',
        excerpt: '25 percent import duty on all imports of aluminum' },
      { claim: 'Copper tariff rate', value: '50%', csms_id: '65794272',
        excerpt: 'ad valorem tariff of 50 percent on all imports of semi-finished copper' },
    ],
    // TODO: Populate with real Census Bureau trade volume data (see BACKLOG.md Phase 2)
    external: [],
    keyMetric: 'Copper at 50% — highest Section 232 rate',
  },
  'automotive': {
    verified: [
      { claim: 'Passenger vehicle tariff', value: '25%', csms_id: '64624801',
        excerpt: '25 percent' },
      { claim: 'Auto parts tariff', value: '25%', csms_id: '64624801',
        excerpt: '25 percent duty on imports' },
    ],
    external: [
      { claim: 'Est. per-vehicle price increase', value: '~$4,000',
        source: 'Yale Budget Lab',
        url: 'https://budgetlab.yale.edu/research/fiscal-economic-and-distributional-effects-25-auto-tariffs' },
    ],
    keyMetric: '25% on vehicles and parts — USMCA-eligible parts exempt',
  },
  'semiconductors': {
    verified: [
      { claim: 'S232 semiconductor rate', value: '25%', csms_id: '67400472',
        excerpt: '25 percent' },
    ],
    // TODO: Populate with real ITC/Census trade volume data (see BACKLOG.md Phase 2)
    external: [],
    keyMetric: 'S232 25% effective Jan 2026 — S301 ramping to 50% by 2027',
  },
  'agriculture': {
    verified: [
      { claim: 'Reciprocal ag exemptions', value: '237 classifications', csms_id: '66814923',
        excerpt: '237 agricultural HTSUS classifications' },
      { claim: 'Brazil ag exemptions', value: '238 classifications', csms_id: '66871909',
        excerpt: '238 agricultural harmonized tariff schedule' },
    ],
    // TODO: Populate with USDA/Census trade volume data (see BACKLOG.md Phase 2)
    external: [],
    keyMetric: '475+ product exemptions across reciprocal and Brazil programs',
  },
  'energy': {
    verified: [
      { claim: 'Canadian energy reduced rate', value: '10%', csms_id: '65054354',
        excerpt: 'energy' },
      { claim: 'Canada general rate increase', value: '35%', csms_id: '65798609',
        excerpt: '35' },
    ],
    external: [],
    keyMetric: 'Energy carve-out: 10% vs 35% general Canada rate',
  },
  'consumer-goods': {
    verified: [
      { claim: 'Reciprocal tariff countries', value: '83 countries', csms_id: '64680374',
        excerpt: 'country-specific ad valorem rate of duty will apply to imported goods of 83 countries' },
      { claim: 'Section 301 product exclusions', value: '178 products', csms_id: '66077997',
        excerpt: '164 product specific exclusions and 14 exclusions covering certain manufacturing equipment' },
    ],
    external: [
      { claim: '2025 tariff revenue collected', value: '$287B',
        source: 'Tax Foundation',
        url: 'https://taxfoundation.org/research/all/federal/trump-tariffs-trade-war/' },
      { claim: 'Est. per-household annual cost', value: '~$1,000-1,300',
        source: 'Boston Federal Reserve',
        url: 'https://www.bostonfed.org/publications/current-policy-perspectives/2025/who-pays-for-tariffs.aspx' },
    ],
    keyMetric: '83 countries with individual rates (10%-50%)',
  },
  'luxury-goods': {
    verified: [],
    external: [],
    keyMetric: 'Full import prohibition on Russian diamonds and seafood',
  },
  'compliance': {
    verified: [
      { claim: 'Stacking priority hierarchy', value: '232 Auto > IEEPA > 232 Steel/Alum', csms_id: '65054270',
        excerpt: 'filers will pay duty in accordance with the prioritization below' },
    ],
    external: [],
    keyMetric: 'EO 14289 tariff stacking hierarchy (retroactive to Mar 4, 2025)',
  },
}
