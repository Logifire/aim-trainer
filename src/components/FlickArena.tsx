import type { TargetGlow, TargetShape } from '../types'
import { useEffect, useRef } from 'react'
import { useFlickGame } from '../hooks/useFlickGame'
import type { SessionDuration } from '../types'

const colorPalettes: Record<TargetGlow, { bg: string; glow: string; ring: string }> = {
  cyan: { bg: 'bg-secondary-container', glow: '0 0 24px rgba(2, 132, 199, 0.75)', ring: 'border-secondary' },
  emerald: { bg: 'bg-tertiary-container', glow: '0 0 24px rgba(6, 95, 70, 0.85)', ring: 'border-tertiary' },
  purple: { bg: 'bg-primary-container', glow: '0 0 24px rgba(126, 34, 206, 0.85)', ring: 'border-primary' },
  coral: { bg: 'bg-error-container', glow: '0 0 24px rgba(153, 27, 27, 0.85)', ring: 'border-error' },
}

interface Props {
  targetSize: number
  targetShape: TargetShape
  speedMul: number
  glow: TargetGlow
  duration: SessionDuration
  onAddRecord: (r: { hits: number; shots: number; misses: number; acc: number; avgMs: number | null }) => void
  onFpsRequestFullscreen?: (el: HTMLDivElement | null) => void
  isPseudo?: boolean
}

export function FlickArena({ targetSize, targetShape, speedMul, glow, duration, onAddRecord, isPseudo }: Props) {
  const arenaRef = useRef<HTMLDivElement>(null)

  const { isRunning, isPaused, showResults, result, hud, targetPos, coords, flashMiss, start, pause, reset, onHit, onMiss } =
    useFlickGame({
      arenaRef,
      targetSize,
      speedMul,
      duration,
      onFinish: onAddRecord,
    })

  const pal = colorPalettes[glow]
  const targetW = targetSize
  const targetH = targetShape === 'sphere' ? targetSize : targetSize * 1.5

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); if (!isRunning) start(); else pause() }
      else if (e.code === 'KeyR') reset()
      else if (e.code === 'Escape' && isRunning) pause()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isRunning, start, pause, reset])

  // expose controls to parent via refs? Instead parent handles keyboard via calling these
  // We'll attach keyboard handling here but only when visible - parent will not duplicate
  // For simplicity, we handle Space/R/Esc inside this component's own effect gated by isVisible
  // Parent App will not add its own flick keyboard - we do it here
  // But to avoid double, we handle via useEffect that checks document visibility
  // Instead we rely on parent App to call start/pause/reset? We'll keep local keyboard:
  // Re-add keyboard locally gated by being mounted (flick tab is mounted only when active)
  // Since FlickArena is only rendered when activeTab==='flick', its effect is naturally gated.

  // Add local keyboard when mounted
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // We use a ref effect inside component for keyboard
  // (We removed keyboard from hook, so add it here)
  // Use effect
  // We need to import useEffect
  return (
    <div className={`flex flex-col gap-3 ${isPseudo ? 'flex-1 min-h-0' : ''}`}>
      {/* Telemetry for flick */}
      <section className="w-full bg-surface rounded-2xl p-4 border border-outline-variant/40 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/30">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-tertiary animate-pulse' : isPaused ? 'bg-error' : 'bg-outline'}`}></span>
            <span className="text-xs uppercase font-bold tracking-wider text-outline">{isRunning ? 'ACTIVE // FLICK' : isPaused ? 'PAUSED' : 'READY // STANDBY'}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 sm:gap-10">
          <div className="flex flex-col items-center">
            <span className="text-[11px] uppercase tracking-widest text-outline font-body font-semibold">Hits</span>
            <span className="font-headline text-3xl font-black text-primary tracking-tight">{hud.hits}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[11px] uppercase tracking-widest text-outline font-body font-semibold">Accuracy</span>
            <span className="font-headline text-3xl font-black text-tertiary tracking-tight">{hud.acc.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[11px] uppercase tracking-widest text-outline font-body font-semibold">Avg Reaction</span>
            <span className="font-headline text-2xl font-black text-secondary tracking-tight">{hud.avgMs != null ? `${Math.round(hud.avgMs)}ms` : '—'}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[11px] uppercase tracking-widest text-outline font-body font-semibold">Time Remaining</span>
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-3xl font-black text-on-surface">{hud.timer === Infinity ? '∞' : hud.timer.toFixed(1)}</span>
              <span className="text-[10px] text-outline font-body">S</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-body text-outline">
          <span>Shots: <strong className="text-on-surface">{hud.shots}</strong></span>
          <span>•</span>
          <span>Misses: <strong className="text-error">{hud.misses}</strong></span>
        </div>
      </section>

      <div
        ref={arenaRef}
        onClick={(e) => {
          // if click originated from target, ignore (target handles it)
          const target = (e.target as HTMLElement).closest('[data-flick-target]')
          if (target) return
          if (!isRunning) return
          onMiss()
        }}
        className={`relative w-full ${isPseudo ? 'flex-1 min-h-[320px] aspect-auto rounded-xl' : 'aspect-[16/10] min-h-[440px] rounded-2xl'} bg-surface-container-lowest border overflow-hidden shadow-2xl flex flex-col justify-between select-none ${flashMiss ? 'border-error/60' : 'border-outline-variant/50'}`}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25 text-outline-variant" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern height="48" id="flickGrid" patternUnits="userSpaceOnUse" width="48">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.8"></path>
            </pattern>
          </defs>
          <rect fill="url(#flickGrid)" height="100%" width="100%"></rect>
          <line opacity="0.4" stroke="currentColor" strokeDasharray="4,4" strokeWidth="1" x1="50%" x2="50%" y1="0" y2="100%"></line>
          <line opacity="0.4" stroke="currentColor" strokeDasharray="4,4" strokeWidth="1" x1="0" x2="100%" y1="50%" y2="50%"></line>
          <circle cx="50%" cy="50%" fill="none" opacity="0.3" r="80" stroke="currentColor" strokeWidth="1"></circle>
        </svg>

        <div className="relative z-10 p-3 flex items-center justify-between pointer-events-none text-xs">
          <div className="flex items-center gap-2 bg-surface/80 backdrop-blur-md px-3 py-1 rounded-md border border-outline-variant/40 font-body text-outline">
            <span>CURSOR COORDINATES</span><span>•</span><span>{coords}</span>
          </div>
          <div className={`${isRunning && targetPos ? '' : 'hidden'} px-2.5 py-0.5 rounded bg-tertiary/20 text-tertiary border border-tertiary/40 font-bold uppercase tracking-wider text-[11px]`}>
            TARGET ACTIVE
          </div>
        </div>

        {isRunning && targetPos && (
          <div
            data-flick-target
            onClick={(e) => {
              e.stopPropagation()
              onHit()
            }}
            className="absolute z-20 flex items-center justify-center cursor-crosshair select-none"
            style={{
              left: targetPos.x,
              top: targetPos.y,
              width: targetW,
              height: targetH,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className={`w-full h-full flex items-center justify-center transition-transform active:scale-90 ${pal.bg}`}
              style={{ boxShadow: pal.glow, borderRadius: targetShape === 'sphere' ? '9999px' : '24px' }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-background/90"></div>
            </div>
            <div className={`absolute -inset-2 pointer-events-none border-2 ${pal.ring} opacity-60`} style={{ borderRadius: targetShape === 'sphere' ? '9999px' : '28px' }} />
          </div>
        )}

        <div className="relative z-10 p-3 flex items-center justify-end pointer-events-none text-xs">
          <div className="flex items-center gap-2">
            <span className="text-outline text-[11px] uppercase tracking-wider">Hits:</span>
            <div className="w-24 h-1.5 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-tertiary transition-all duration-150" style={{ width: `${Math.min(100, hud.hits * 6)}%` }}></div>
            </div>
          </div>
        </div>

        {!isRunning && !showResults && (
          <div className="absolute inset-0 bg-surface-container-lowest/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-container/30 border border-primary/40 flex items-center justify-center shadow-lg text-primary">
              <span className="material-symbols-outlined text-3xl">ads_click</span>
            </div>
            <div className="max-w-md">
              <h2 className="font-headline text-2xl sm:text-3xl font-black text-on-surface tracking-tight uppercase">FLICK SHOT PRACTICE</h2>
              <p className="text-xs sm:text-sm text-on-surface-variant font-body mt-2 leading-relaxed">
                Targets spawn randomly — shoot as many as possible. Missing counts as a miss. Speed controls spawn rate and lifetime.
              </p>
            </div>
            <button
              onClick={start}
              className="mt-2 px-8 py-3.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-headline font-black text-base uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(126,34,206,0.4)] flex items-center gap-2 active:scale-95 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-xl">play_arrow</span>
              <span>{isPaused ? 'RESUME FLICK' : 'START FLICK'}</span>
              <span className="text-[11px] font-body bg-white/20 px-2 py-0.5 rounded ml-1">[SPACE]</span>
            </button>
            <div className="flex items-center gap-4 text-xs text-outline font-body mt-1">
              <span>Press <strong className="text-on-surface">ESC</strong> to pause</span><span>•</span><span>Press <strong className="text-on-surface">R</strong> to restart</span>
            </div>
          </div>
        )}

        {showResults && result && (
          <div className="absolute inset-0 bg-surface-container-lowest/95 backdrop-blur-lg z-40 flex flex-col items-center justify-center p-6 text-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-xs uppercase tracking-widest text-secondary font-bold font-body">Session Complete</span>
              <h3 className="font-headline text-3xl sm:text-4xl font-black text-on-surface tracking-tight mt-1 uppercase">{result.rank}</h3>
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-tertiary/20 text-tertiary border border-tertiary/30 mt-2">{result.badge}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl my-2">
              <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex flex-col items-center"><span className="text-[10px] uppercase tracking-wider text-outline font-semibold">Hits</span><span className="font-headline text-2xl font-black text-primary mt-1">{result.hits}</span></div>
              <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex flex-col items-center"><span className="text-[10px] uppercase tracking-wider text-outline font-semibold">Accuracy</span><span className="font-headline text-2xl font-black text-tertiary mt-1">{result.acc.toFixed(1)}%</span></div>
              <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex flex-col items-center"><span className="text-[10px] uppercase tracking-wider text-outline font-semibold">Avg Reaction</span><span className="font-headline text-2xl font-black text-secondary mt-1">{result.avgMs != null ? `${Math.round(result.avgMs)}ms` : '—'}</span></div>
              <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex flex-col items-center"><span className="text-[10px] uppercase tracking-wider text-outline font-semibold">Shots</span><span className="font-headline text-2xl font-black text-on-surface mt-1">{result.shots}</span></div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button onClick={start} className="px-6 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-headline font-black text-sm uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95" type="button"><span className="material-symbols-outlined text-[18px]">replay</span><span>Play Again</span></button>
              <button onClick={reset} className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold uppercase tracking-wider border border-outline-variant/40 transition cursor-pointer" type="button">Adjust Settings</button>
            </div>
          </div>
        )}
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-3 bg-surface rounded-xl px-4 py-2.5 border border-outline-variant/40 text-xs ${isPseudo ? 'hidden' : ''}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => (isRunning ? pause() : start())} className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition font-semibold flex items-center gap-1.5 cursor-pointer" type="button"><span className="material-symbols-outlined text-[16px]">pause</span><span>Pause [ESC]</span></button>
          <button onClick={reset} className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition font-semibold flex items-center gap-1.5 cursor-pointer" type="button"><span className="material-symbols-outlined text-[16px]">restart_alt</span><span>Reset [R]</span></button>
        </div>
        <div className="flex items-center gap-3 text-outline">
          <span>Size: <strong className="text-tertiary font-medium">{targetSize}px</strong></span><span>•</span><span>Lifetime: <strong className="text-secondary font-medium">{speedMul <= 0.6 ? '∞' : speedMul <= 1.0 ? '~1.8s' : speedMul <= 2.0 ? '~1.5s' : '~1.2s'}</strong></span>
        </div>
      </div>
    </div>
  )
}
