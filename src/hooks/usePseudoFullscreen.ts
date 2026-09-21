import { useEffect, useState, useCallback } from 'react'

function computeIsPseudoDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0
  if (!hasTouch) return false
  // hybrid exception: device has fine pointer + hover capability (mouse/trackpad) -> treat as desktop -> native fullscreen
  // pure touch: coarse pointer + no hover
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const hoverNone = window.matchMedia('(hover: none)').matches
  // also check any-pointer coarse to handle hybrid where primary is fine but any is coarse
  // we want pseudo only when the primary interaction is touch-like
  // so: if hover is hover and pointer is fine -> hybrid -> native
  const isHybrid = window.matchMedia('(hover: hover)').matches && window.matchMedia('(pointer: fine)').matches
  if (isHybrid) return false
  return coarse && hoverNone
}

export function useIsPseudoDevice(): boolean {
  const [isPseudo, setIsPseudo] = useState(() => computeIsPseudoDevice())

  useEffect(() => {
    const m1 = window.matchMedia('(pointer: coarse)')
    const m2 = window.matchMedia('(hover: none)')
    const m3 = window.matchMedia('(hover: hover)')
    const m4 = window.matchMedia('(pointer: fine)')
    const handler = () => setIsPseudo(computeIsPseudoDevice())
    m1.addEventListener('change', handler)
    m2.addEventListener('change', handler)
    m3.addEventListener('change', handler)
    m4.addEventListener('change', handler)
    window.addEventListener('resize', handler)
    return () => {
      m1.removeEventListener('change', handler)
      m2.removeEventListener('change', handler)
      m3.removeEventListener('change', handler)
      m4.removeEventListener('change', handler)
      window.removeEventListener('resize', handler)
    }
  }, [])

  return isPseudo
}

export function usePseudoFullscreen(isPseudoDevice: boolean) {
  const [pseudoActive, setPseudoActive] = useState(false)

  const enter = useCallback(() => setPseudoActive(true), [])
  const exit = useCallback(() => setPseudoActive(false), [])
  const toggle = useCallback(() => setPseudoActive((v) => !v), [])

  // lock body scroll when pseudo active
  useEffect(() => {
    if (!pseudoActive) return
    const prevOverflow = document.body.style.overflow
    const prevPosition = document.body.style.position
    document.body.style.overflow = 'hidden'
    // prevent background scroll bounce on iOS
    // keep scroll position
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.position = prevPosition
    }
  }, [pseudoActive])

  // ESC to exit pseudo, and auto-exit if device type changes to non-pseudo
  useEffect(() => {
    if (!pseudoActive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault()
        setPseudoActive(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pseudoActive])

  // if switching from touch to hybrid (e.g., dock keyboard) exit pseudo
  useEffect(() => {
    if (!isPseudoDevice && pseudoActive) {
      setPseudoActive(false)
    }
  }, [isPseudoDevice, pseudoActive])

  return { pseudoActive, enter, exit, toggle, setPseudoActive }
}
