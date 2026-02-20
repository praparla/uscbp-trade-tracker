// Action type color mapping — consistent across all views
export const ACTION_TYPE_COLORS = {
  tariff: '#3b82f6',       // blue
  quota: '#f59e0b',        // amber
  embargo: '#ef4444',      // red
  sanction: '#8b5cf6',     // purple
  duty: '#14b8a6',         // teal
  exclusion: '#ec4899',    // pink
  suspension: '#f97316',   // orange
  modification: '#6b7280', // gray
  investigation: '#6366f1',// indigo
  other: '#94a3b8',        // slate
}

export const ACTION_TYPE_LABELS = {
  tariff: 'Tariff',
  quota: 'Quota',
  embargo: 'Embargo',
  sanction: 'Sanction',
  duty: 'Duty',
  exclusion: 'Exclusion',
  suspension: 'Suspension',
  modification: 'Modification',
  investigation: 'Investigation',
  other: 'Other',
}

export const STATUS_COLORS = {
  active: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  superseded: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
}

export const ITEMS_PER_PAGE = 25

export const DEV_API_URL = 'http://localhost:8000'
