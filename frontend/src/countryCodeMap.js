/**
 * Country name mapping between trade_actions.json dataset names
 * and Natural Earth 110m TopoJSON feature names.
 *
 * Only entries where the names differ need to be listed.
 * Countries with identical names in both sources are matched automatically.
 */

// Dataset name → TopoJSON feature name (only mismatches)
const DATASET_TO_TOPO_OVERRIDES = {
  'Bosnia and Herzegovina': 'Bosnia and Herz.',
  "Cote d'Ivoire": "Côte d'Ivoire",
  'Democratic Republic of the Congo': 'Dem. Rep. Congo',
  'Equatorial Guinea': 'Eq. Guinea',
  'Falkland Islands': 'Falkland Is.',
  'North Macedonia': 'Macedonia',
}

// Reverse: TopoJSON feature name → dataset name (only mismatches)
const TOPO_TO_DATASET_OVERRIDES = Object.fromEntries(
  Object.entries(DATASET_TO_TOPO_OVERRIDES).map(([k, v]) => [v, k])
)

// Countries in the dataset that are too small for the 110m TopoJSON
// (they won't appear on the map but are valid data entries)
export const UNMAPPABLE_COUNTRIES = [
  'Hong Kong',
  'Macau',
  'Malta',
  'Mauritius',
  'Nauru',
  'Liechtenstein',
]

// Special values that are not real countries
export const SPECIAL_COUNTRY_VALUES = ['All', 'Multiple']

/**
 * Convert a dataset country name to its TopoJSON feature name.
 * Returns the override if one exists, otherwise returns the name as-is.
 * Returns null for special values and unmappable countries.
 */
export function datasetNameToTopoName(datasetName) {
  if (!datasetName || typeof datasetName !== 'string') return null
  if (SPECIAL_COUNTRY_VALUES.includes(datasetName)) return null
  if (UNMAPPABLE_COUNTRIES.includes(datasetName)) return null
  return DATASET_TO_TOPO_OVERRIDES[datasetName] || datasetName
}

/**
 * Convert a TopoJSON feature name to a dataset country name.
 * Returns the override if one exists, otherwise returns the name as-is.
 */
export function topoNameToDatasetName(topoName) {
  if (!topoName || typeof topoName !== 'string') return null
  return TOPO_TO_DATASET_OVERRIDES[topoName] || topoName
}

/**
 * Check if a dataset country name can be displayed on the map.
 */
export function isMappableCountry(datasetName) {
  if (!datasetName || typeof datasetName !== 'string') return false
  if (SPECIAL_COUNTRY_VALUES.includes(datasetName)) return false
  if (UNMAPPABLE_COUNTRIES.includes(datasetName)) return false
  return true
}
