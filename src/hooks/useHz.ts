import { useEffect, useRef, useState } from 'react'

const STANDARD_HZ = [60, 75, 90, 100, 120, 144, 165, 180, 200, 240, 280, 300, 360, 480, 540]

function snapToStandard(rawHz: number): number | string {
  // Cap for ultra-high refresh displays (>540 Hz, e.g. 560 Hz prototypes)
  if (rawHz >= 553) return '>540'
  let best = STANDARD_HZ[0]
  let bestDiff = Math.abs(rawHz - best)
  for (const hz of STANDARD_HZ) {
    const diff = Math.abs(rawHz - hz)
    if (diff < bestDiff) {
      bestDiff = diff
      best = hz
    }
  }
  // Higher Hz has smaller delta (2.08ms at 480 Hz) so jitter is proportionally larger;
  // allow slightly wider snap tolerance for >=240 Hz
  const tolerance = best >= 240 ? 10 : 7
  return bestDiff <= tolerance ? best : Math.round(rawHz)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Estimates the display's refresh rate (Hz) by measuring rAF intervals.
 * - Samples ~90 frames (~1.5s at 60Hz) then computes median delta
 * - Re-measures when tab becomes visible again (handles display switch / tab throttling)
 * - Snaps to nearest standard Hz (60/75/90/120/144/165/240/360/480/540)
 * - Caps ultra-high refresh as '>540' for displays >553 Hz (raw)
 * Returns null until first measurement completes.
 */
export function useHz(): string | number | null {
  const [hz, setHz] = useState<string | number | null>(null)
  const rafRef = useRef<number>(0)
  const measuringRef = useRef(false)

  // useEffect ensures this only runs on client
  useEffect(() => {
    let deltas: number[] = []
    let lastTs = 0
    let frameCount = 0
    const targetFrames = 90

    const measure = (ts: number) => {
      if (lastTs === 0) {
        lastTs = ts
        rafRef.current = requestAnimationFrame(measure)
        return
      }
      const delta = ts - lastTs
      lastTs = ts

      // Ignore large deltas from tab backgrounding / jank (>50ms = likely throttled)
      if (delta > 0 && delta < 50) {
        deltas.push(delta)
        frameCount++
      }

      if (frameCount >= targetFrames) {
        if (deltas.length >= 30) {
          const med = median(deltas)
          const rawHz = 1000 / med
          setHz(snapToStandard(rawHz))
        }
        measuringRef.current = false
        return
      }
      rafRef.current = requestAnimationFrame(measure)
    }

    const startMeasurement = () => {
      if (measuringRef.current) return
      measuringRef.current = true
      deltas = []
      frameCount = 0
      lastTs = 0
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(measure)
    }

    // Initial measurement after a short delay to let page settle
    const timeoutId = window.setTimeout(startMeasurement, 300)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Re-measure shortly after becoming visible (display may have changed)
        window.setTimeout(startMeasurement, 400)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return hz
}
