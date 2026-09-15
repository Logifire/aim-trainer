import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionDuration } from '../types'

function spawnIntervalMs(speedMul: number) {
  return Math.max(350, Math.min(2000, 2000 - speedMul * 450))
}

function lifetimeMs(speedMul: number) {
  if (speedMul <= 0.6) return Infinity
  // 0.6 -> 1800, 3.5 -> ~1075, clamp 1200-1800 as per plan, but extend to 1200 at max
  const v = 1800 - (speedMul - 0.6) * 250
  return Math.max(1200, Math.min(1800, v))
}

export interface FlickHud {
  hits: number
  misses: number
  shots: number
  acc: number
  avgMs: number | null
  timer: number
}

export interface FlickResult {
  hits: number
  shots: number
  misses: number
  acc: number
  avgMs: number | null
  rank: string
  badge: string
}

export function useFlickGame(opts: {
  arenaRef: React.RefObject<HTMLDivElement | null>
  targetSize: number
  speedMul: number
  duration: SessionDuration
  onFinish: (r: { hits: number; shots: number; misses: number; acc: number; avgMs: number | null }) => void
}) {
  const { arenaRef, targetSize, speedMul, duration, onFinish } = opts

  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [result, setResult] = useState<FlickResult | null>(null)
  const [hud, setHud] = useState<FlickHud>({ hits: 0, misses: 0, shots: 0, acc: 0, avgMs: null, timer: duration >= 9999 ? Infinity : duration })
  const [targetPos, setTargetPos] = useState<{ x: number; y: number; spawnAt: number } | null>(null)
  const [coords, setCoords] = useState('X: 000 Y: 000')
  const [flashMiss, setFlashMiss] = useState(false)

  const stateRef = useRef({
    hits: 0,
    misses: 0,
    shots: 0,
    reactionSum: 0,
    timeRemaining: duration as number,
    target: null as { x: number; y: number; spawnAt: number } | null,
    duration,
    speedMul,
    targetSize,
  })

  useEffect(() => {
    stateRef.current.speedMul = speedMul
    stateRef.current.targetSize = targetSize
    stateRef.current.duration = duration
    if (!isRunning) setHud((h) => ({ ...h, timer: duration >= 9999 ? Infinity : duration }))
  }, [speedMul, targetSize, duration, isRunning])

  // coords
  useEffect(() => {
    const el = arenaRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      setCoords(`X: ${String(Math.round(e.clientX - r.left)).padStart(3, '0')} Y: ${String(Math.round(e.clientY - r.top)).padStart(3, '0')}`)
    }
    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [arenaRef])

  const prevPosRef = useRef<{ x: number; y: number } | null>(null)

  const spawnTarget = useCallback(() => {
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    const pad = stateRef.current.targetSize / 2 + 8
    const maxW = rect.width - pad * 2
    const maxH = rect.height - pad * 2
    if (maxW <= 0 || maxH <= 0) return

    let best: { x: number; y: number } | null = null
    // try to keep min distance from previous
    const minDist = 100
    for (let i = 0; i < 8; i++) {
      const x = pad + Math.random() * maxW
      const y = pad + Math.random() * maxH
      if (!prevPosRef.current) { best = { x, y }; break }
      const d = Math.hypot(x - prevPosRef.current.x, y - prevPosRef.current.y)
      if (d >= minDist) { best = { x, y }; break }
      if (!best) best = { x, y }
    }
    if (!best) return
    prevPosRef.current = best
    const spawnAt = Date.now()
    stateRef.current.target = { ...best, spawnAt }
    setTargetPos({ ...best, spawnAt })
  }, [arenaRef])

  const rafRef = useRef<number>(0)
  const lastTsRef = useRef(0)
  const expireTimeoutRef = useRef<number | null>(null)

  const scheduleExpiry = useCallback(() => {
    if (expireTimeoutRef.current) window.clearTimeout(expireTimeoutRef.current)
    const lt = lifetimeMs(stateRef.current.speedMul)
    if (!Number.isFinite(lt)) return
    const currentSpawnAt = stateRef.current.target?.spawnAt
    expireTimeoutRef.current = window.setTimeout(() => {
      // only expire if same target still active
      if (stateRef.current.target && stateRef.current.target.spawnAt === currentSpawnAt && isRunningRef.current) {
        stateRef.current.misses++
        stateRef.current.shots++
        const acc = stateRef.current.shots > 0 ? (stateRef.current.hits / stateRef.current.shots) * 100 : 0
        const avg = stateRef.current.hits > 0 ? stateRef.current.reactionSum / stateRef.current.hits : null
        setHud((h) => ({ ...h, misses: stateRef.current.misses, shots: stateRef.current.shots, acc, avgMs: avg }))
        spawnTarget()
        scheduleExpiry()
      }
    }, lt)
  }, [spawnTarget])

  const isRunningRef = useRef(false)
  useEffect(() => { isRunningRef.current = isRunning }, [isRunning])

  const finishSession = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (expireTimeoutRef.current) window.clearTimeout(expireTimeoutRef.current)
    setIsRunning(false)
    setIsPaused(false)
    isRunningRef.current = false
    const s = stateRef.current
    const acc = s.shots > 0 ? (s.hits / s.shots) * 100 : 0
    const avg = s.hits > 0 ? s.reactionSum / s.hits : null
    let rank = 'Rookie Tier'
    let badge = 'Keep Practicing'
    if (acc >= 95 && s.hits >= 15) { rank = 'Flick God'; badge = 'Inhuman Reflexes' }
    else if (acc >= 80 && s.hits >= 10) { rank = 'Sharpshooter'; badge = 'Deadly Accuracy' }
    else if (acc >= 60) { rank = 'Marksman'; badge = 'Solid Aim' }
    else if (s.hits >= 5) { rank = 'Skirmisher'; badge = 'Getting There' }
    const res: FlickResult = { hits: s.hits, shots: s.shots, misses: s.misses, acc, avgMs: avg, rank, badge }
    setResult(res)
    setShowResults(true)
    onFinish({ hits: s.hits, shots: s.shots, misses: s.misses, acc, avgMs: avg })
  }, [onFinish])

  const loop = useCallback((ts: number) => {
    const dt = Math.min((ts - lastTsRef.current) / 1000, 0.1)
    lastTsRef.current = ts
    const s = stateRef.current
    if (s.duration < 9999) {
      s.timeRemaining -= dt
      if (s.timeRemaining <= 0) {
        s.timeRemaining = 0
        setHud((h) => ({ ...h, timer: 0 }))
        finishSession()
        return
      }
    }
    const acc = s.shots > 0 ? (s.hits / s.shots) * 100 : 0
    const avg = s.hits > 0 ? s.reactionSum / s.hits : null
    setHud({ hits: s.hits, misses: s.misses, shots: s.shots, acc, avgMs: avg, timer: s.duration >= 9999 ? Infinity : s.timeRemaining })
    rafRef.current = requestAnimationFrame(loop)
  }, [finishSession])

  const start = useCallback(() => {
    if (isPaused) {
      setIsPaused(false)
      setIsRunning(true)
      isRunningRef.current = true
      setShowResults(false)
      lastTsRef.current = performance.now()
      rafRef.current = requestAnimationFrame(loop)
      scheduleExpiry()
      return
    }
    const s = stateRef.current
    s.hits = 0; s.misses = 0; s.shots = 0; s.reactionSum = 0
    s.timeRemaining = duration as number
    prevPosRef.current = null
    setHud({ hits: 0, misses: 0, shots: 0, acc: 0, avgMs: null, timer: duration >= 9999 ? Infinity : duration as number })
    setResult(null)
    setShowResults(false)
    // spawn after layout
    requestAnimationFrame(() => {
      spawnTarget()
      scheduleExpiry()
    })
    setIsRunning(true)
    isRunningRef.current = true
    setIsPaused(false)
    lastTsRef.current = performance.now()
    rafRef.current = requestAnimationFrame(loop)
  }, [isPaused, duration, loop, spawnTarget, scheduleExpiry])

  const pause = useCallback(() => {
    if (!isRunning) return
    setIsPaused(true)
    setIsRunning(false)
    isRunningRef.current = false
    cancelAnimationFrame(rafRef.current)
    if (expireTimeoutRef.current) window.clearTimeout(expireTimeoutRef.current)
  }, [isRunning])

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (expireTimeoutRef.current) window.clearTimeout(expireTimeoutRef.current)
    setIsRunning(false); setIsPaused(false); setShowResults(false)
    isRunningRef.current = false
    const s = stateRef.current
    s.hits = 0; s.misses = 0; s.shots = 0; s.reactionSum = 0; s.timeRemaining = duration as number
    s.target = null
    setTargetPos(null)
    setHud({ hits: 0, misses: 0, shots: 0, acc: 0, avgMs: null, timer: duration >= 9999 ? Infinity : duration as number })
    setResult(null)
    prevPosRef.current = null
  }, [duration])

  const onHit = useCallback(() => {
    if (!isRunning || !stateRef.current.target) return
    const now = Date.now()
    const rt = now - stateRef.current.target.spawnAt
    stateRef.current.hits++
    stateRef.current.shots++
    stateRef.current.reactionSum += rt
    const acc = (stateRef.current.hits / stateRef.current.shots) * 100
    const avg = stateRef.current.reactionSum / stateRef.current.hits
    setHud((h) => ({ ...h, hits: stateRef.current.hits, shots: stateRef.current.shots, acc, avgMs: avg }))
    spawnTarget()
    scheduleExpiry()
    // optional: immediate spawn scheduling already done, no extra interval needed
  }, [isRunning, spawnTarget, scheduleExpiry])

  // For interval-based auto-spawn when not hitting (even if lifetime is Infinity, spawn via interval if miss? Actually with Infinity we only spawn on hit, so add interval fallback)
  // If lifetime is Infinity, we should not auto-expire; but if speed is low, user still expects targets to stay till hit -> no interval.

  const onMiss = useCallback(() => {
    if (!isRunning) return
    // count as miss only if clicked on arena background (caller ensures target click doesn't bubble)
    stateRef.current.misses++
    stateRef.current.shots++
    const acc = (stateRef.current.hits / stateRef.current.shots) * 100
    const avg = stateRef.current.hits > 0 ? stateRef.current.reactionSum / stateRef.current.hits : null
    setHud((h) => ({ ...h, misses: stateRef.current.misses, shots: stateRef.current.shots, acc, avgMs: avg }))
    setFlashMiss(true)
    window.setTimeout(() => setFlashMiss(false), 120)
  }, [isRunning])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (expireTimeoutRef.current) window.clearTimeout(expireTimeoutRef.current)
    }
  }, [])

  // expose spawnInterval for info
  const interval = spawnIntervalMs(speedMul)
  const lifetime = lifetimeMs(speedMul)

  return { isRunning, isPaused, showResults, result, hud, targetPos, coords, flashMiss, interval, lifetime, start, pause, reset, onHit, onMiss, spawnTarget }
}
