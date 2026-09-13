import { useEffect, useState } from 'react'
import type { SessionRecord } from '../types'

const KEY = 'aim-trainer:history'

export function useHistory() {
  const [records, setRecords] = useState<SessionRecord[]>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return JSON.parse(raw) as SessionRecord[]
    } catch {}
    return []
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(records))
    } catch {}
  }, [records])

  const add = (rec: SessionRecord) => {
    setRecords((prev) => [rec, ...prev].slice(0, 20))
  }

  const best = records.reduce<{ acc: number; tot: number }>(
    (a, r) => ({ acc: Math.max(a.acc, r.accuracy), tot: Math.max(a.tot, r.onTargetSec) }),
    { acc: 0, tot: 0 },
  )

  return { records: records.slice(0, 3), all: records, add, best, total: records.length }
}
