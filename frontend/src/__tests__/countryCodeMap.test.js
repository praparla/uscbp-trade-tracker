import { describe, it, expect } from 'vitest'
import {
  datasetNameToTopoName,
  topoNameToDatasetName,
  isMappableCountry,
  SPECIAL_COUNTRY_VALUES,
  UNMAPPABLE_COUNTRIES,
} from '../countryCodeMap'

// All 90 country names in the current dataset
const DATASET_COUNTRIES = [
  'Algeria', 'Angola', 'Austria', 'Bangladesh', 'Belgium',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Cambodia', 'Cameroon', 'Canada', 'Chad', 'China',
  "Cote d'Ivoire", 'Croatia', 'Cyprus', 'Czechia',
  'Democratic Republic of the Congo', 'Denmark', 'Equatorial Guinea',
  'Estonia', 'Falkland Islands', 'Fiji', 'Finland', 'France',
  'Germany', 'Greece', 'Guyana', 'Hong Kong', 'Hungary', 'India',
  'Indonesia', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan',
  'Jordan', 'Kazakhstan', 'Laos', 'Latvia', 'Lesotho', 'Libya',
  'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macau', 'Madagascar',
  'Malawi', 'Malaysia', 'Malta', 'Mauritius', 'Mexico', 'Moldova',
  'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Netherlands',
  'Nicaragua', 'Nigeria', 'North Macedonia', 'Norway', 'Pakistan',
  'Philippines', 'Poland', 'Portugal', 'Romania', 'Russia', 'Serbia',
  'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain',
  'Sri Lanka', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Thailand',
  'Tunisia', 'United Kingdom', 'Vanuatu', 'Venezuela', 'Vietnam',
  'Zambia', 'Zimbabwe',
]

describe('countryCodeMap', () => {
  describe('datasetNameToTopoName', () => {
    it('returns override name for countries with different TopoJSON names', () => {
      expect(datasetNameToTopoName('Bosnia and Herzegovina')).toBe('Bosnia and Herz.')
      expect(datasetNameToTopoName("Cote d'Ivoire")).toBe("Côte d'Ivoire")
      expect(datasetNameToTopoName('Democratic Republic of the Congo')).toBe('Dem. Rep. Congo')
      expect(datasetNameToTopoName('Equatorial Guinea')).toBe('Eq. Guinea')
      expect(datasetNameToTopoName('Falkland Islands')).toBe('Falkland Is.')
      expect(datasetNameToTopoName('North Macedonia')).toBe('Macedonia')
    })

    it('returns the same name for countries with matching TopoJSON names', () => {
      expect(datasetNameToTopoName('China')).toBe('China')
      expect(datasetNameToTopoName('Canada')).toBe('Canada')
      expect(datasetNameToTopoName('Mexico')).toBe('Mexico')
      expect(datasetNameToTopoName('India')).toBe('India')
    })

    it('returns null for special values', () => {
      expect(datasetNameToTopoName('All')).toBeNull()
      expect(datasetNameToTopoName('Multiple')).toBeNull()
    })

    it('returns null for unmappable countries (too small for 110m)', () => {
      expect(datasetNameToTopoName('Hong Kong')).toBeNull()
      expect(datasetNameToTopoName('Macau')).toBeNull()
      expect(datasetNameToTopoName('Malta')).toBeNull()
      expect(datasetNameToTopoName('Nauru')).toBeNull()
    })

    it('handles null, undefined, empty string, and non-string input', () => {
      expect(datasetNameToTopoName(null)).toBeNull()
      expect(datasetNameToTopoName(undefined)).toBeNull()
      expect(datasetNameToTopoName('')).toBeNull()
      expect(datasetNameToTopoName(42)).toBeNull()
    })
  })

  describe('topoNameToDatasetName', () => {
    it('returns override name for countries with different dataset names', () => {
      expect(topoNameToDatasetName('Bosnia and Herz.')).toBe('Bosnia and Herzegovina')
      expect(topoNameToDatasetName("Côte d'Ivoire")).toBe("Cote d'Ivoire")
      expect(topoNameToDatasetName('Dem. Rep. Congo')).toBe('Democratic Republic of the Congo')
      expect(topoNameToDatasetName('Eq. Guinea')).toBe('Equatorial Guinea')
      expect(topoNameToDatasetName('Falkland Is.')).toBe('Falkland Islands')
      expect(topoNameToDatasetName('Macedonia')).toBe('North Macedonia')
    })

    it('returns the same name for countries with matching names', () => {
      expect(topoNameToDatasetName('China')).toBe('China')
      expect(topoNameToDatasetName('Brazil')).toBe('Brazil')
    })

    it('handles null and undefined input', () => {
      expect(topoNameToDatasetName(null)).toBeNull()
      expect(topoNameToDatasetName(undefined)).toBeNull()
      expect(topoNameToDatasetName('')).toBeNull()
    })
  })

  describe('reverse mapping consistency', () => {
    it('round-trips correctly for all override entries', () => {
      const overrideCountries = [
        'Bosnia and Herzegovina',
        "Cote d'Ivoire",
        'Democratic Republic of the Congo',
        'Equatorial Guinea',
        'Falkland Islands',
        'North Macedonia',
      ]
      for (const name of overrideCountries) {
        const topoName = datasetNameToTopoName(name)
        expect(topoName).not.toBeNull()
        expect(topoNameToDatasetName(topoName)).toBe(name)
      }
    })
  })

  describe('isMappableCountry', () => {
    it('returns true for regular countries', () => {
      expect(isMappableCountry('China')).toBe(true)
      expect(isMappableCountry('Canada')).toBe(true)
      expect(isMappableCountry('Bosnia and Herzegovina')).toBe(true)
    })

    it('returns false for special values', () => {
      expect(isMappableCountry('All')).toBe(false)
      expect(isMappableCountry('Multiple')).toBe(false)
    })

    it('returns false for unmappable countries', () => {
      for (const name of UNMAPPABLE_COUNTRIES) {
        expect(isMappableCountry(name)).toBe(false)
      }
    })

    it('returns false for invalid input', () => {
      expect(isMappableCountry(null)).toBe(false)
      expect(isMappableCountry(undefined)).toBe(false)
      expect(isMappableCountry('')).toBe(false)
    })
  })

  describe('all dataset countries are handled', () => {
    it('every dataset country either maps or is in unmappable list', () => {
      for (const name of DATASET_COUNTRIES) {
        const topoName = datasetNameToTopoName(name)
        const isUnmappable = UNMAPPABLE_COUNTRIES.includes(name)
        expect(
          topoName !== null || isUnmappable,
          `Country "${name}" is neither mappable nor in UNMAPPABLE_COUNTRIES`
        ).toBe(true)
      }
    })
  })

  describe('SPECIAL_COUNTRY_VALUES', () => {
    it('contains All and Multiple', () => {
      expect(SPECIAL_COUNTRY_VALUES).toContain('All')
      expect(SPECIAL_COUNTRY_VALUES).toContain('Multiple')
    })
  })
})
