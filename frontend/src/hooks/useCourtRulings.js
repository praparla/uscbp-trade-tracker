import { useMemo } from 'react'
import courtRulingsData from '../data/court_rulings.json'

export function useCourtRulings(filters = {}) {
  const meta = courtRulingsData.meta || {}
  const allRulings = courtRulingsData.rulings || []

  const filteredRulings = useMemo(() => {
    return allRulings.filter((ruling) => {
      // Country filter
      if (filters.countries && filters.countries.length > 0) {
        const countries = ruling.affected_countries || []
        const matchesCountry = countries.some(
          (c) => c === 'All' || filters.countries.includes(c)
        )
        if (!matchesCountry) return false
      }

      // Date range filter — uses filing_date
      if (filters.dateStart || filters.dateEnd) {
        const filingDate = ruling.filing_date || ''
        if (!filingDate) return false
        if (filters.dateStart && filingDate < filters.dateStart) return false
        if (filters.dateEnd && filingDate > filters.dateEnd) return false
      }

      // Text search
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const searchable = [
          ruling.case_name,
          ruling.case_number,
          ruling.summary,
          ruling.court,
          ruling.key_legal_question,
          ruling.plaintiff,
          ruling.defendant,
          ...(ruling.affected_tariff_programs || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!searchable.includes(q)) return false
      }

      return true
    })
  }, [allRulings, filters.countries, filters.dateStart, filters.dateEnd, filters.search])

  const sortedRulings = useMemo(() => {
    return [...filteredRulings].sort((a, b) => {
      const dateA = a.ruling_date || a.filing_date || ''
      const dateB = b.ruling_date || b.filing_date || ''
      return dateB.localeCompare(dateA) // newest first
    })
  }, [filteredRulings])

  const stats = useMemo(() => {
    const total = filteredRulings.length
    const pending = filteredRulings.filter((r) => r.status === 'pending').length
    const decided = filteredRulings.filter(
      (r) => r.status === 'decided' || r.status === 'enacted' || r.status === 'dismissed'
    ).length

    const byCourt = {}
    filteredRulings.forEach((r) => {
      const court = r.court || 'Unknown'
      byCourt[court] = (byCourt[court] || 0) + 1
    })

    const byProgram = {}
    filteredRulings.forEach((r) => {
      ;(r.affected_tariff_programs || []).forEach((p) => {
        byProgram[p] = (byProgram[p] || 0) + 1
      })
    })

    const programsChallenged = Object.keys(byProgram).length

    return { total, pending, decided, byCourt, byProgram, programsChallenged }
  }, [filteredRulings])

  const timelineEvents = useMemo(() => {
    const events = []
    filteredRulings.forEach((ruling) => {
      ;(ruling.timeline_events || []).forEach((evt) => {
        events.push({
          ...evt,
          rulingId: ruling.id,
          caseName: ruling.case_name,
          rulingType: ruling.ruling_type,
        })
      })
    })
    return events.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }, [filteredRulings])

  const challengedActionIds = useMemo(() => {
    const ids = new Set()
    allRulings
      .filter((r) => r.status === 'pending')
      .forEach((r) => {
        ;(r.related_action_ids || []).forEach((id) => ids.add(id))
      })
    return ids
  }, [allRulings])

  return {
    meta,
    allRulings,
    filteredRulings,
    sortedRulings,
    stats,
    timelineEvents,
    challengedActionIds,
  }
}
