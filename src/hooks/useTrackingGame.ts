import { useCallback, useEffect, useRef, useState } from 'react'
import type { MovementPattern, SessionDuration, TargetGlow, TargetShape } from '../types'

function hitTest(
  px: number,
  py: number,
  tx: number,
  ty: number,
  size: number,
  shape: TargetShape,
  slop: number,
): boolean {
  const dx = px - tx
  const dy = py - ty
  if (shape === 'sphere') {
    return Math.hypot(dx, dy) <= size / 2 + slop
  }
  const w = size / 2 + slop
  const h = (size * 1.5) / 2 + slop
  return Math.abs(dx) <= w && Math.abs(dy) <= h
}

export interface TrackingHud {
  score: number
  acc: number
  tot: number
  timer: number
}

export interface TrackingResult {
  score: number
  acc: number
  on: string
  off: string
  rank: string
  badge: string
}

export function useTrackingGame(opts: {
  arenaRef: React.RefObject<HTMLDivElement | null>
  targetRef: React.RefObject<HTMLDivElement | null>
  targetShape: TargetShape
  targetSize: number
  speedMul: number
  pattern: MovementPattern
  glow: TargetGlow
  duration: SessionDuration
  onFinish: (r: {
    score: number
    accuracy: number
    onTargetSec: number
    pattern: MovementPattern
    size: number
    speed: number
    duration: SessionDuration
  }) => void
}) {
  const { arenaRef, targetRef, targetShape, targetSize, speedMul, pattern, glow, duration, onFinish } = opts

  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [hud, setHud] = useState<TrackingHud>({ score: 0, acc: 0, tot: 0, timer: duration >= 9999 ? Infinity : duration })
  const [coords, setCoords] = useState('X: 000 Y: 000')
  const [isHovered, setIsHovered] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [result, setResult] = useState<TrackingResult | null>(null)

  const stateRef = useRef<{
    score: number
    totalFrames: number
    onTargetFrames: number
    timeRemaining: number
    posX: number
    posY: number
    velX: number
    velY: number
    sinTime: number
    isHovered: boolean
    targetShape: TargetShape
    targetSize: number
    speedMul: number
    pattern: MovementPattern
    glow: TargetGlow
    duration: SessionDuration
  }>({
    score: 0,
    totalFrames: 0,
    onTargetFrames: 0,
    timeRemaining: duration as number,
    posX: 200,
    posY: 150,
    velX: 3.2,
    velY: 2.2,
    sinTime: 0,
    isHovered: false,
    targetShape,
    targetSize,
    speedMul,
    pattern,
    glow,
    duration,
  })

  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false })
  const lastPointerTypeRef = useRef<'mouse' | 'touch' | 'pen'>('mouse')

  useEffect(() => {
    stateRef.current.targetShape = targetShape
    stateRef.current.targetSize = targetSize
    stateRef.current.speedMul = speedMul
    stateRef.current.pattern = pattern
    stateRef.current.glow = glow
    stateRef.current.duration = duration
    if (!isRunning) setHud((h) => ({ ...h, timer: duration >= 9999 ? Infinity : duration }))
  }, [targetShape, targetSize, speedMul, pattern, glow, duration, isRunning])

  const rafRef = useRef<number>(0)
  const lastTsRef = useRef(0)

  const finishSession = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setIsRunning(false)
    setIsPaused(false)
    const s = stateRef.current
    const score = Math.round(s.score)
    const acc = s.totalFrames > 0 ? (s.onTargetFrames / s.totalFrames) * 100 : 0
    const on = (s.onTargetFrames / 60).toFixed(1)
    const off = Math.max(0, (s.totalFrames - s.onTargetFrames) / 60).toFixed(1)
    let rank = 'Rookie Tier'
    let badge = 'Keep Practicing'
    if (acc >= 90) {
      rank = 'Apex Operator'
      badge = 'World Class Tracking'
    } else if (acc >= 75) {
      rank = 'Diamond Operator'
      badge = 'Consistent Accuracy'
    } else if (acc >= 50) {
      rank = 'Gold Striker'
      badge = 'Solid Baseline'
    }
    setResult({ score, acc, on, off, rank, badge })
    setShowResults(true)
    onFinish({
      score,
      accuracy: Number(acc.toFixed(1)),
      onTargetSec: Number(on),
      pattern: s.pattern,
      size: s.targetSize,
      speed: s.speedMul,
      duration: s.duration,
    })
  }, [onFinish])

  const loop = useCallback(
    (ts: number) => {
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.1)
      lastTsRef.current = ts
      const s = stateRef.current

      // pointer hit-test before scoring — works for both mouse hover and touch drag
      // touch gets a small slop to account for fat fingers; mouse is precise
      const slop = lastPointerTypeRef.current === 'touch' ? 6 : 0
      const p = pointerRef.current
      const hit = p.active && hitTest(p.x, p.y, s.posX, s.posY, s.targetSize, s.targetShape, slop)
      if (hit !== s.isHovered) {
        s.isHovered = hit
        setIsHovered(hit)
      } else {
        s.isHovered = hit
      }

      s.totalFrames++

      if (s.duration < 9999) {
        s.timeRemaining -= dt
        if (s.timeRemaining <= 0) {
          s.timeRemaining = 0
          setHud((h) => ({ ...h, timer: 0 as number }))
          finishSession()
          return
        }
      }

      if (s.isHovered) {
        s.onTargetFrames++
        s.score += 140 * dt
      }

      const arena = arenaRef.current
      if (!arena) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }
      const rect = arena.getBoundingClientRect()
      const curH = s.targetShape === 'sphere' ? s.targetSize : s.targetSize * 1.5
      const halfW = s.targetSize / 2
      const halfH = curH / 2
      s.sinTime += dt * 2.6 * s.speedMul

      if (s.pattern === 'smooth') {
        s.posX += s.velX
        const amplitude = (rect.height - curH) * 0.32
        const centerY = rect.height / 2
        const targetY = centerY + Math.sin(s.sinTime) * amplitude * 0.55 + Math.sin(s.sinTime * 0.42) * amplitude * 0.25
        s.posY += (targetY - s.posY) * 0.05 * (1 + s.speedMul * 0.12) + s.velY * 0.08
        s.posY = Math.max(halfH, Math.min(rect.height - halfH, s.posY))
      } else if (s.pattern === 'zigzag') {
        s.posX += s.velX * 1.25
        s.posY += s.velY * 1.25
      } else {
        s.posX += s.velX
        s.posY += s.velY
        if (Math.random() < 0.035) {
          s.velX = (Math.random() - 0.5) * (5 * s.speedMul)
          s.velY = (Math.random() - 0.5) * (5 * s.speedMul)
        }
      }

      const minX = halfW,
        maxX = rect.width - halfW,
        minY = halfH,
        maxY = rect.height - halfH
      if (s.posX <= minX) {
        s.posX = minX
        s.velX = Math.abs(s.velX)
      } else if (s.posX >= maxX) {
        s.posX = maxX
        s.velX = -Math.abs(s.velX)
      }
      if (s.posY <= minY) {
        s.posY = minY
        s.velY = Math.abs(s.velY)
      } else if (s.posY >= maxY) {
        s.posY = maxY
        s.velY = -Math.abs(s.velY)
      }

      if (targetRef.current) {
        targetRef.current.style.left = s.posX + 'px'
        targetRef.current.style.top = s.posY + 'px'
      }

      const liveAcc = s.totalFrames > 0 ? (s.onTargetFrames / s.totalFrames) * 100 : 0
      setHud({
        score: Math.floor(s.score),
        acc: liveAcc,
        tot: s.onTargetFrames / 60,
        timer: s.duration >= 9999 ? Infinity : s.timeRemaining,
      })

      rafRef.current = requestAnimationFrame(loop)
    },
    [arenaRef, targetRef, finishSession],
  )

  const start = useCallback(() => {
    if (isPaused) {
      setIsPaused(false)
      setIsRunning(true)
      setShowResults(false)
      lastTsRef.current = performance.now()
      rafRef.current = requestAnimationFrame(loop)
      return
    }
    const s = stateRef.current
    s.score = 0
    s.totalFrames = 0
    s.onTargetFrames = 0
    s.timeRemaining = duration
    s.sinTime = 0
    s.isHovered = false
    setIsHovered(false)
    const rect = arenaRef.current?.getBoundingClientRect()
    if (rect) {
      s.posX = rect.width / 2
      s.posY = rect.height / 2
    }
    s.velX = (Math.random() > 0.5 ? 1 : -1) * (2.0 * speedMul)
    s.velY = (Math.random() > 0.5 ? 1 : -1) * (1.6 * speedMul)
    setIsRunning(true)
    setIsPaused(false)
    setShowResults(false)
    setHud({ score: 0, acc: 0, tot: 0, timer: duration >= 9999 ? Infinity : duration })
    lastTsRef.current = performance.now()
    rafRef.current = requestAnimationFrame(loop)
  }, [isPaused, duration, speedMul, arenaRef, loop])

  const pause = useCallback(() => {
    if (!isRunning) return
    setIsPaused(true)
    setIsRunning(false)
    cancelAnimationFrame(rafRef.current)
  }, [isRunning])

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setIsRunning(false)
    setIsPaused(false)
    setShowResults(false)
    const s = stateRef.current
    s.score = 0
    s.totalFrames = 0
    s.onTargetFrames = 0
    s.timeRemaining = duration
    s.isHovered = false
    setIsHovered(false)
    setHud({ score: 0, acc: 0, tot: 0, timer: duration >= 9999 ? Infinity : duration })
    setResult(null)
    if (document.fullscreenElement) document.exitFullscreen?.()
  }, [duration])

  // pointer handlers — unified mouse + touch via Pointer Events
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const arena = arenaRef.current
      if (!arena) return
      const rect = arena.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const t = e.target as HTMLElement
      const isButton = !!t.closest('button, a')
      lastPointerTypeRef.current = e.pointerType as 'mouse' | 'touch' | 'pen'
      // Always record pointer position for hit-test (so desktop hover works immediately after Start)
      // but don't steal the pointer from buttons.
      pointerRef.current = { x, y, active: true }
      setCoords(`X: ${String(Math.round(x)).padStart(3, '0')} Y: ${String(Math.round(y)).padStart(3, '0')}`)
      if (isButton) return
      // Only capture when game is running - otherwise we steal the click from the Start button
      if (!isRunning && !isPaused) return
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        // ignore if capture not supported
      }
    },
    [arenaRef, isRunning, isPaused],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const arena = arenaRef.current
      if (!arena) return
      const rect = arena.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      lastPointerTypeRef.current = e.pointerType as 'mouse' | 'touch' | 'pen'
      const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen'
      if (isTouch) {
        if (!pointerRef.current.active) return
        pointerRef.current.x = x
        pointerRef.current.y = y
      } else {
        // mouse: track when inside arena bounds
        const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height
        pointerRef.current.x = x
        pointerRef.current.y = y
        pointerRef.current.active = inside
      }
      setCoords(`X: ${String(Math.round(x)).padStart(3, '0')} Y: ${String(Math.round(y)).padStart(3, '0')}`)
    },
    [arenaRef],
  )

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen'
    if (isTouch) {
      pointerRef.current.active = false
      stateRef.current.isHovered = false
      setIsHovered(false)
    }
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }, [])

  const onPointerEnter = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    lastPointerTypeRef.current = 'mouse'
    pointerRef.current = { x, y, active: true }
    setCoords(`X: ${String(Math.round(x)).padStart(3, '0')} Y: ${String(Math.round(y)).padStart(3, '0')}`)
  }, [arenaRef])

  const onPointerLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') {
      pointerRef.current.active = false
      stateRef.current.isHovered = false
      setIsHovered(false)
    }
  }, [])

  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointerRef.current.active = false
    stateRef.current.isHovered = false
    setIsHovered(false)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }, [])

  // cleanup on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return {
    isRunning,
    isPaused,
    hud,
    coords,
    isHovered,
    showResults,
    result,
    stateRef,
    start,
    pause,
    reset,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerEnter,
    onPointerLeave,
    onPointerCancel,
  }
}
