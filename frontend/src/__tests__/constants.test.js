import { describe, it, expect } from 'vitest'
import {
  ACTION_TYPE_COLORS,
  ACTION_TYPE_LABELS,
  STATUS_COLORS,
  ITEMS_PER_PAGE,
  DEV_API_URL,
} from '../constants'

describe('ACTION_TYPE_COLORS', () => {
  const expectedTypes = [
    'tariff', 'quota', 'embargo', 'sanction', 'duty',
    'exclusion', 'suspension', 'modification', 'investigation', 'other',
  ]

  it('has colors for all 10 action types', () => {
    expect(Object.keys(ACTION_TYPE_COLORS)).toHaveLength(10)
    expectedTypes.forEach((type) => {
      expect(ACTION_TYPE_COLORS).toHaveProperty(type)
    })
  })

  it('all color values are valid hex strings', () => {
    Object.values(ACTION_TYPE_COLORS).forEach((color) => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
    })
  })

  it('has unique colors for each type', () => {
    const colors = Object.values(ACTION_TYPE_COLORS)
    const unique = new Set(colors)
    expect(unique.size).toBe(colors.length)
  })
})

describe('ACTION_TYPE_LABELS', () => {
  it('has labels for all action types in ACTION_TYPE_COLORS', () => {
    Object.keys(ACTION_TYPE_COLORS).forEach((type) => {
      expect(ACTION_TYPE_LABELS).toHaveProperty(type)
      expect(typeof ACTION_TYPE_LABELS[type]).toBe('string')
      expect(ACTION_TYPE_LABELS[type].length).toBeGreaterThan(0)
    })
  })

  it('labels are capitalized display names', () => {
    Object.values(ACTION_TYPE_LABELS).forEach((label) => {
      expect(label[0]).toBe(label[0].toUpperCase())
    })
  })
})

describe('STATUS_COLORS', () => {
  const expectedStatuses = ['active', 'expired', 'pending', 'superseded']

  it('has colors for all 4 statuses', () => {
    expect(Object.keys(STATUS_COLORS)).toHaveLength(4)
    expectedStatuses.forEach((status) => {
      expect(STATUS_COLORS).toHaveProperty(status)
    })
  })

  it('each status has bg, text, and dot properties', () => {
    Object.values(STATUS_COLORS).forEach((style) => {
      expect(style).toHaveProperty('bg')
      expect(style).toHaveProperty('text')
      expect(style).toHaveProperty('dot')
    })
  })

  it('bg values are Tailwind bg-* classes', () => {
    Object.values(STATUS_COLORS).forEach((style) => {
      expect(style.bg).toMatch(/^bg-/)
    })
  })

  it('text values are Tailwind text-* classes', () => {
    Object.values(STATUS_COLORS).forEach((style) => {
      expect(style.text).toMatch(/^text-/)
    })
  })
})

describe('ITEMS_PER_PAGE', () => {
  it('is a positive integer', () => {
    expect(ITEMS_PER_PAGE).toBeGreaterThan(0)
    expect(Number.isInteger(ITEMS_PER_PAGE)).toBe(true)
  })

  it('is 25', () => {
    expect(ITEMS_PER_PAGE).toBe(25)
  })
})

describe('DEV_API_URL', () => {
  it('points to localhost:8000', () => {
    expect(DEV_API_URL).toBe('http://localhost:8000')
  })

  it('uses http protocol (not https for local dev)', () => {
    expect(DEV_API_URL).toMatch(/^http:\/\//)
  })
})
