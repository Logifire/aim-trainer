import { useEffect, useState } from 'react'
import type { AnyRecord, FlickRecord, SessionRecord } from '../types'

const KEY = 'aim-trainer:history'

export function useHistory() {
  const [records, setRecords] = useState<AnyRecord[]>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as AnyRecord[]
        // migrate old records without mode -> tracking
        return parsed.map((r) => (r.mode ? r : { ...r, mode: 'tracking' as const }))
      }
    } catch {}
    return []
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(records))
    } catch {}
  }, [records])

  const add = (rec: AnyRecord) => {
    setRecords((prev) => [rec, ...prev].slice(0, 40))
  }

  const trackingRecords = records.filter((r): r is SessionRecord => (r.mode ?? 'tracking') === 'tracking')
  const flickRecords = records.filter((r): r is FlickRecord => r.mode === 'flick')

  const bestTracking = trackingRecords.reduce<{ acc: number; tot: number }>(
    (a, r) => ({ acc: Math.max(a.acc, r.accuracy), tot: Math.max(a.tot, r.onTargetSec) }),
    { acc: 0, tot: 0 },
  )

  const bestFlick = flickRecords.reduce<{ hits: number; acc: number; avg: number | null }>(
    (a, r) => ({
      hits: Math.max(a.hits, r.hits),
      acc: Math.max(a.acc, r.accuracy),
      avg: a.avg == null ? r.avgReactionMs : r.avgReactionMs == null ? a.avg : Math.min(a.avg, r.avgReactionMs),
    }),
    { hits: 0, acc: 0, avg: null as number | null },
  )

  // legacy: best for tracking
  const best = bestTracking

  return {
    records: trackingRecords.slice(0, 3),
    all: records,
    add,
    best,
    bestTracking,
    bestFlick,
    trackingRecords: trackingRecords.slice(0, 3),
    flickRecords: flickRecords.slice(0, 3),
    total: trackingRecords.length,
    totalTracking: trackingRecords.length,
    totalFlick: flickRecords.length,
  }
}
