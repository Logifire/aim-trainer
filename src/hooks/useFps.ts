import { useEffect, useRef, useState } from 'react'

/**
 * Live FPS counter — global, independent of game loops.
 * - Counts rAF frames and updates once per second (throttled)
 * - Runs continuously in App header, shared between tracking/flick
 * - No dependency on isRunning — shows true browser FPS even in idle/throttled tab
 * - Very low overhead: 1 integer increment per frame + 1 setState per second
 */
export function useFps(): number {
  const [fps, setFps] = useState(60)
  const ref = useRef({ frames: 0, last: 0 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    ref.current.last = performance.now()
    const loop = (ts: number) => {
      const f = ref.current
      f.frames++
      if (ts - f.last >= 1000) {
        // Guard against huge delta from long tab backgrounding
        const delta = ts - f.last
        if (delta < 5000) {
          setFps(Math.round((f.frames * 1000) / delta))
        }
        f.frames = 0
        f.last = ts
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return fps
}
