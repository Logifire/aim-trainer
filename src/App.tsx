import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameMode, MovementPattern, SessionDuration, TargetGlow, TargetShape } from './types'
import { useHistory } from './hooks/useHistory'
import { useTrackingGame } from './hooks/useTrackingGame'
import { Tabs } from './components/Tabs'
import { FlickArena } from './components/FlickArena'

const colorPalettes: Record<TargetGlow, { bg: string; glow: string; ring: string }> = {
  cyan: { bg: 'bg-secondary-container', glow: '0 0 24px rgba(2, 132, 199, 0.75)', ring: 'border-secondary' },
  emerald: { bg: 'bg-tertiary-container', glow: '0 0 24px rgba(6, 95, 70, 0.85)', ring: 'border-tertiary' },
  purple: { bg: 'bg-primary-container', glow: '0 0 24px rgba(126, 34, 206, 0.85)', ring: 'border-primary' },
  coral: { bg: 'bg-error-container', glow: '0 0 24px rgba(153, 27, 27, 0.85)', ring: 'border-error' },
}

export default function App() {
  const [activeTab, setActiveTab] = useState<GameMode>(() => (localStorage.getItem('aim:tab') as GameMode) || 'tracking')
  useEffect(() => localStorage.setItem('aim:tab', activeTab), [activeTab])

  // settings (persisted) - shared between modes
  const [targetShape, setTargetShape] = useState<TargetShape>(() => (localStorage.getItem('aim:shape') as TargetShape) || 'sphere')
  const [targetSize, setTargetSize] = useState<number>(() => Number(localStorage.getItem('aim:size') || 55))
  const [speedMul, setSpeedMul] = useState<number>(() => {
    const raw = Number(localStorage.getItem('aim:speed') || 1.0)
    return Math.min(3.5, Math.max(0.3, raw))
  })
  const [pattern, setPattern] = useState<MovementPattern>(() => (localStorage.getItem('aim:pattern') as MovementPattern) || 'smooth')
  const [glow, setGlow] = useState<TargetGlow>(() => (localStorage.getItem('aim:glow') as TargetGlow) || 'cyan')
  const [duration, setDuration] = useState<SessionDuration>(() => Number(localStorage.getItem('aim:duration') || 30) as SessionDuration)

  useEffect(() => localStorage.setItem('aim:shape', targetShape), [targetShape])
  useEffect(() => localStorage.setItem('aim:size', String(targetSize)), [targetSize])
  useEffect(() => localStorage.setItem('aim:speed', String(speedMul)), [speedMul])
  useEffect(() => localStorage.setItem('aim:pattern', pattern), [pattern])
  useEffect(() => localStorage.setItem('aim:glow', glow), [glow])
  useEffect(() => localStorage.setItem('aim:duration', String(duration)), [duration])

  const { add, trackingRecords, flickRecords, bestTracking, bestFlick, totalTracking, totalFlick } = useHistory()

  // tracking engine — extracted to hook for better structure + touch support
  const arenaRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)

  const tracking = useTrackingGame({
    arenaRef,
    targetRef,
    targetShape,
    targetSize,
    speedMul,
    pattern,
    glow,
    duration,
    onFinish: useCallback(
      (r: { score: number; accuracy: number; onTargetSec: number; pattern: MovementPattern; size: number; speed: number; duration: SessionDuration }) => {
        add({
          id: String(Date.now()),
          mode: 'tracking',
          score: r.score,
          accuracy: r.accuracy,
          onTargetSec: r.onTargetSec,
          pattern: r.pattern,
          size: r.size,
          speed: r.speed,
          duration: r.duration,
          timestamp: Date.now(),
        })
      },
      [add],
    ),
  })

  // pause tracking when switching away from tracking
  useEffect(() => {
    if (activeTab !== 'tracking' && tracking.isRunning) {
      tracking.pause()
    }
  }, [activeTab, tracking.isRunning, tracking.pause])

  // keyboard for tracking only when active
  useEffect(() => {
    if (activeTab !== 'tracking') return
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); if (!tracking.isRunning) tracking.start(); else tracking.pause() }
      else if (e.code === 'KeyR') tracking.reset()
      else if (e.code === 'Escape' && tracking.isRunning) tracking.pause()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [activeTab, tracking.isRunning, tracking.start, tracking.pause, tracking.reset])

  const pal = colorPalettes[glow]
  const targetW = targetSize
  const targetH = targetShape === 'sphere' ? targetSize : targetSize * 1.5
  const shortPattern: Record<MovementPattern, string> = { smooth: 'Smooth Curve', zigzag: 'Zig-Zag Bounces', reactive: 'Reactive Shifts' }

  const handleFlickFinish = useCallback((r: { hits: number; shots: number; misses: number; acc: number; avgMs: number | null }) => {
    add({
      id: String(Date.now()),
      mode: 'flick',
      hits: r.hits,
      shots: r.shots,
      accuracy: Number(r.acc.toFixed(1)),
      avgReactionMs: r.avgMs != null ? Math.round(r.avgMs) : null,
      size: targetSize,
      speed: speedMul,
      duration,
      timestamp: Date.now(),
    })
  }, [add, targetSize, speedMul, duration])

  const handleTabChange = (m: GameMode) => {
    // pause current before switch
    if (tracking.isRunning) tracking.pause()
    setActiveTab(m)
  }

  const handleFullscreen = () => {
    if (activeTab === 'tracking') arenaRef.current?.requestFullscreen?.()
    else {
      const el = document.querySelector('[data-flick-arena]') as HTMLElement | null
      el?.requestFullscreen?.()
    }
  }

  return (
    <div className="bg-background font-body text-on-surface antialiased selection:bg-primary selection:text-on-primary min-h-screen flex flex-col justify-between">
      <header className="w-full bg-surface/90 border-b border-outline-variant/40 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-[0_0_12px_rgba(192,132,252,0.3)]">
              <span className="material-symbols-outlined text-xl">radar</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-black text-lg tracking-wider text-on-surface flex items-center gap-1.5">AIM TRAINER</span>
              <span className="text-[10px] tracking-widest text-outline uppercase font-body">{activeTab === 'tracking' ? 'Smooth Tracking Practice' : 'Flick Shot Practice'}</span>
            </div>
          </div>
          <div className="hidden sm:flex flex-1 justify-center">
            <Tabs active={activeTab} onChange={handleTabChange} />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/30 text-xs font-body">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
              <span className="text-on-surface-variant font-medium">FPS: {tracking.fps}</span>
            </div>
            <button
              className="w-8 h-8 rounded-lg bg-surface-container-low border border-outline-variant/40 hover:border-secondary hover:text-secondary text-on-surface-variant flex items-center justify-center transition"
              onClick={handleFullscreen}
              title="Fullscreen"
            >
              <span className="material-symbols-outlined text-[18px]">fullscreen</span>
            </button>
          </div>
        </div>
        <div className="sm:hidden flex justify-center pb-3 px-4">
          <Tabs active={activeTab} onChange={handleTabChange} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">

        {activeTab === 'tracking' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 flex flex-col gap-3">
                <section className="w-full bg-surface rounded-2xl p-4 border border-outline-variant/40 flex flex-wrap items-center justify-between gap-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/30">
                      <span className={`w-2 h-2 rounded-full ${tracking.isRunning ? 'bg-tertiary animate-pulse' : tracking.isPaused ? 'bg-error' : 'bg-outline'}`}></span>
                      <span className="text-xs uppercase font-bold tracking-wider text-outline">{tracking.isRunning ? 'ACTIVE // TRACKING' : tracking.isPaused ? 'PAUSED' : 'READY // STANDBY'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 sm:gap-10">
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] uppercase tracking-widest text-outline font-body font-semibold">Time On Target</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-headline text-3xl font-black text-primary tracking-tight">{tracking.hud.tot.toFixed(1)}</span>
                        <span className="text-[10px] text-outline font-body">S</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] uppercase tracking-widest text-outline font-body font-semibold">Accuracy</span>
                      <span className="font-headline text-3xl font-black text-tertiary tracking-tight">{tracking.hud.acc.toFixed(1)}%</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] uppercase tracking-widest text-outline font-body font-semibold">Time Remaining</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-headline text-3xl font-black text-on-surface">{tracking.hud.timer === Infinity ? '∞' : tracking.hud.timer.toFixed(1)}</span>
                        <span className="text-[10px] text-outline font-body">S</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col text-right bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/30">
                      <span className="text-[10px] uppercase tracking-wider text-outline font-semibold">Best TOT</span>
                      <span className="text-xs font-bold text-secondary tracking-wider font-headline">
                        {bestTracking.tot ? `${bestTracking.tot.toFixed(1)}s (${bestTracking.acc.toFixed(1)}%)` : '—'}
                      </span>
                    </div>
                  </div>
                </section>
                <div
                  ref={arenaRef}
                  onPointerDown={tracking.onPointerDown}
                  onPointerMove={tracking.onPointerMove}
                  onPointerUp={tracking.onPointerUp}
                  onPointerEnter={tracking.onPointerEnter}
                  onPointerCancel={tracking.onPointerCancel}
                  onPointerLeave={tracking.onPointerLeave}
                  style={{ touchAction: 'none' }}
                  className="relative w-full aspect-[16/10] min-h-[440px] bg-surface-container-lowest rounded-2xl border border-outline-variant/50 overflow-hidden shadow-2xl flex flex-col justify-between select-none touch-none"
                >
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25 text-outline-variant" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern height="48" id="arenaGrid" patternUnits="userSpaceOnUse" width="48">
                        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.8"></path>
                      </pattern>
                    </defs>
                    <rect fill="url(#arenaGrid)" height="100%" width="100%"></rect>
                    <line opacity="0.4" stroke="currentColor" strokeDasharray="4,4" strokeWidth="1" x1="50%" x2="50%" y1="0" y2="100%"></line>
                    <line opacity="0.4" stroke="currentColor" strokeDasharray="4,4" strokeWidth="1" x1="0" x2="100%" y1="50%" y2="50%"></line>
                    <circle cx="50%" cy="50%" fill="none" opacity="0.3" r="80" stroke="currentColor" strokeWidth="1"></circle>
                  </svg>

                  <div className="relative z-10 p-3 flex items-center justify-between pointer-events-none text-xs">
                    <div className="flex items-center gap-2 bg-surface/80 backdrop-blur-md px-3 py-1 rounded-md border border-outline-variant/40 font-body text-outline">
                      <span>CURSOR COORDINATES</span><span>•</span><span>{tracking.coords}</span>
                    </div>
                    <div className={`${tracking.isHovered && tracking.isRunning ? '' : 'hidden'} px-2.5 py-0.5 rounded bg-tertiary/20 text-tertiary border border-tertiary/40 font-bold uppercase tracking-wider text-[11px]`}>
                      ON TARGET
                    </div>
                  </div>

                  <div
                    ref={targetRef}
                    className="absolute z-20 flex items-center justify-center pointer-events-none"
                    style={{ left: '50%', top: '50%', width: targetW, height: targetH, transform: 'translate(-50%, -50%)' }}
                  >
                    <div
                      className={`w-full h-full flex items-center justify-center transition-all ${pal.bg}`}
                      style={{ boxShadow: pal.glow, borderRadius: targetShape === 'sphere' ? '9999px' : '24px' }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-background/90"></div>
                    </div>
                    <div
                      className={`absolute -inset-2 pointer-events-none transition-opacity border-2 ${pal.ring} ${tracking.isHovered ? 'opacity-100' : 'opacity-0'}`}
                      style={{ borderRadius: targetShape === 'sphere' ? '9999px' : '28px' }}
                    />
                  </div>

                  <div className="relative z-10 p-3 flex items-center justify-end pointer-events-none text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-outline text-[11px] uppercase tracking-wider">Contact:</span>
                      <div className="w-24 h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-tertiary transition-all duration-75" style={{ width: tracking.isHovered && tracking.isRunning ? '100%' : '0%' }}></div>
                      </div>
                    </div>
                  </div>

                  {!tracking.isRunning && !tracking.showResults && (
                    <div className="absolute inset-0 bg-surface-container-lowest/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary-container/30 border border-primary/40 flex items-center justify-center shadow-lg text-primary">
                        <span className="material-symbols-outlined text-3xl">sports_esports</span>
                      </div>
                      <div className="max-w-md">
                        <h2 className="font-headline text-2xl sm:text-3xl font-black text-on-surface tracking-tight uppercase">SMOOTH TRACKING PRACTICE</h2>
                        <p className="text-xs sm:text-sm text-on-surface-variant font-body mt-2 leading-relaxed">
                          Keep your crosshair continuously centered on the moving target.
                        </p>
                      </div>
                      <button
                        onClick={tracking.start}
                        className="mt-2 px-8 py-3.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-headline font-black text-base uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(126,34,206,0.4)] flex items-center gap-2 active:scale-95 cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-xl">play_arrow</span>
                        <span>{tracking.isPaused ? 'RESUME TRACKING' : 'START PRACTICE'}</span>
                        <span className="text-[11px] font-body bg-white/20 px-2 py-0.5 rounded ml-1">[SPACE]</span>
                      </button>
                      <div className="flex items-center gap-4 text-xs text-outline font-body mt-1">
                        <span>Press <strong className="text-on-surface">ESC</strong> to pause</span><span>•</span><span>Press <strong className="text-on-surface">R</strong> to restart</span>
                      </div>
                    </div>
                  )}

                  {tracking.showResults && tracking.result && (
                    <div className="absolute inset-0 bg-surface-container-lowest/95 backdrop-blur-lg z-40 flex flex-col items-center justify-center p-6 text-center gap-4">
                      <div className="flex flex-col items-center">
                        <span className="text-xs uppercase tracking-widest text-secondary font-bold font-body">Session Complete</span>
                        <h3 className="font-headline text-3xl sm:text-4xl font-black text-on-surface tracking-tight mt-1 uppercase">{tracking.result.rank}</h3>
                        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-tertiary/20 text-tertiary border border-tertiary/30 mt-2">{tracking.result.badge}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl my-2">
                        <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex flex-col items-center"><span className="text-[10px] uppercase tracking-wider text-outline font-semibold">Total Time on Target</span><span className="font-headline text-2xl font-black text-primary mt-1">{tracking.result.on}s</span></div>
                        <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex flex-col items-center"><span className="text-[10px] uppercase tracking-wider text-outline font-semibold">Accuracy</span><span className="font-headline text-2xl font-black text-tertiary mt-1">{tracking.result.acc.toFixed(1)}%</span></div>
                        <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex flex-col items-center"><span className="text-[10px] uppercase tracking-wider text-outline font-semibold">On Target</span><span className="font-headline text-2xl font-black text-on-surface mt-1">{tracking.result.on}s</span></div>
                        <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex flex-col items-center"><span className="text-[10px] uppercase tracking-wider text-outline font-semibold">Off Target</span><span className="font-headline text-2xl font-black text-error mt-1">{tracking.result.off}s</span></div>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <button onClick={tracking.start} className="px-6 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-headline font-black text-sm uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95" type="button"><span className="material-symbols-outlined text-[18px]">replay</span><span>Play Again</span></button>
                        <button onClick={tracking.reset} className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold uppercase tracking-wider border border-outline-variant/40 transition cursor-pointer" type="button">Adjust Settings</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 bg-surface rounded-xl px-4 py-2.5 border border-outline-variant/40 text-xs">
                  <div className="flex items-center gap-2">
                    <button onClick={() => (tracking.isRunning ? tracking.pause() : tracking.start())} className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition font-semibold flex items-center gap-1.5 cursor-pointer" type="button"><span className="material-symbols-outlined text-[16px]">pause</span><span>Pause [ESC]</span></button>
                    <button onClick={tracking.reset} className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition font-semibold flex items-center gap-1.5 cursor-pointer" type="button"><span className="material-symbols-outlined text-[16px]">restart_alt</span><span>Reset [R]</span></button>
                  </div>
                  <div className="flex items-center gap-3 text-outline">
                    <span>Pattern: <strong className="text-secondary font-medium">{shortPattern[pattern]}</strong></span><span>•</span><span>Size: <strong className="text-tertiary font-medium">{targetSize}px (Medium)</strong></span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center gap-2"><span className="material-symbols-outlined text-tertiary text-lg">history</span><h4 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface">Recent Tracking Sessions</h4></div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {trackingRecords.length === 0 ? (
                      <div className="col-span-3 bg-surface rounded-xl p-6 border border-outline-variant/30 flex flex-col items-center justify-center gap-2 text-center">
                        <span className="material-symbols-outlined text-outline text-2xl">history</span>
                        <p className="text-sm text-on-surface-variant">No tracking sessions yet</p>
                        <p className="text-xs text-outline">Complete tracking to see your history here</p>
                      </div>
                    ) : (
                      trackingRecords.map((r, idx) => (
                        <div key={r.id} className="bg-surface rounded-xl p-4 border border-outline-variant/30 flex flex-col justify-between gap-3 shadow-sm">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-secondary">Session #{totalTracking - idx}</span>
                            <span className={`${r.accuracy >= 90 ? 'bg-tertiary/20 text-tertiary' : 'bg-surface-container text-on-surface-variant'} px-2 py-0.5 rounded text-[10px] font-bold`}>{r.accuracy.toFixed(1)}% ACC</span>
                          </div>
                          <div>
                            <div className="font-headline text-xl font-black text-on-surface">{r.onTargetSec.toFixed(1)}s <span className="text-[10px] font-medium text-primary uppercase font-body tracking-wide">Time On Target</span></div>
                            <p className="text-[10px] text-outline mt-0.5 leading-tight">{r.duration >= 9999 ? 'Free' : `${r.duration}s`} • {r.pattern === 'reactive' ? 'Reactive' : r.pattern === 'zigzag' ? 'Zig-Zag' : 'Smooth'} • {(r.speed ?? 1).toFixed(1)}× speed • {r.size}px</p>
                          </div>
                          <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden"><div className={`h-full ${r.accuracy >= 90 ? 'bg-tertiary' : r.accuracy >= 80 ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${r.accuracy}%` }}></div></div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <SettingsDeck
                targetShape={targetShape} setTargetShape={setTargetShape}
                targetSize={targetSize} setTargetSize={setTargetSize}
                speedMul={speedMul} setSpeedMul={setSpeedMul}
                pattern={pattern} setPattern={setPattern}
                glow={glow} setGlow={setGlow}
                duration={duration} setDuration={setDuration}
                activeTab={activeTab}
                stateRef={tracking.stateRef}
                bestTracking={bestTracking}
                bestFlick={bestFlick}
                totalTracking={totalTracking}
                totalFlick={totalFlick}
              />
            </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 flex flex-col gap-3" data-flick-arena>
              <FlickArena targetSize={targetSize} targetShape={targetShape} speedMul={speedMul} glow={glow} duration={duration} onAddRecord={handleFlickFinish} />
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-tertiary text-lg">history</span><h4 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface">Recent Flick Sessions</h4></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {flickRecords.length === 0 ? (
                    <div className="col-span-3 bg-surface rounded-xl p-6 border border-outline-variant/30 flex flex-col items-center justify-center gap-2 text-center">
                      <span className="material-symbols-outlined text-outline text-2xl">ads_click</span>
                      <p className="text-sm text-on-surface-variant">No flick sessions yet</p>
                      <p className="text-xs text-outline">Complete flick shot to see your history here</p>
                    </div>
                  ) : (
                    flickRecords.map((r, idx) => (
                      <div key={r.id} className="bg-surface rounded-xl p-4 border border-outline-variant/30 flex flex-col justify-between gap-3 shadow-sm">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-secondary">Session #{totalFlick - idx}</span>
                          <span className={`${r.accuracy >= 80 ? 'bg-tertiary/20 text-tertiary' : 'bg-surface-container text-on-surface-variant'} px-2 py-0.5 rounded text-[10px] font-bold`}>{r.accuracy.toFixed(1)}% ACC</span>
                        </div>
                        <div>
                          <div className="font-headline text-xl font-black text-on-surface">{r.hits} <span className="text-[10px] font-medium text-primary uppercase font-body tracking-wide">Hits</span> <span className="text-xs font-normal text-outline">/ {r.shots} shots</span></div>
                          <p className="text-[10px] text-outline mt-0.5 leading-tight">{r.duration >= 9999 ? 'Free' : `${r.duration}s`} • {r.avgReactionMs != null ? `${r.avgReactionMs}ms avg` : '—'} • {(r.speed ?? 1).toFixed(1)}× speed • {r.size}px</p>
                        </div>
                        <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden"><div className={`h-full ${r.accuracy >= 80 ? 'bg-tertiary' : r.accuracy >= 60 ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${r.accuracy}%` }}></div></div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <SettingsDeck
              targetShape={targetShape} setTargetShape={setTargetShape}
              targetSize={targetSize} setTargetSize={setTargetSize}
              speedMul={speedMul} setSpeedMul={setSpeedMul}
              pattern={pattern} setPattern={setPattern}
              glow={glow} setGlow={setGlow}
              duration={duration} setDuration={setDuration}
              activeTab={activeTab}
              stateRef={tracking.stateRef}
              bestTracking={bestTracking}
              bestFlick={bestFlick}
              totalTracking={totalTracking}
              totalFlick={totalFlick}
            />
          </div>
        )}
      </main>

      <footer className="w-full bg-surface-container-lowest border-t border-outline-variant/30 py-3 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-outline font-body">
          <div>Aim Trainer • Runs 100% in browser (Static HTML/JS) • Free & Open Source</div>
        </div>
      </footer>
    </div>
  )
}

function SettingsDeck({ targetShape, setTargetShape, targetSize, setTargetSize, speedMul, setSpeedMul, pattern, setPattern, glow, setGlow, duration, setDuration, activeTab, stateRef, bestTracking, bestFlick, totalTracking, totalFlick }: {
  targetShape: TargetShape; setTargetShape: (v: TargetShape) => void
  targetSize: number; setTargetSize: (v: number) => void
  speedMul: number; setSpeedMul: (v: number) => void
  pattern: MovementPattern; setPattern: (v: MovementPattern) => void
  glow: TargetGlow; setGlow: (v: TargetGlow) => void
  duration: SessionDuration; setDuration: (v: SessionDuration) => void
  activeTab: GameMode
  stateRef: React.MutableRefObject<any>
  bestTracking: { acc: number; tot: number }
  bestFlick: { hits: number; acc: number; avg: number | null }
  totalTracking: number; totalFlick: number
}) {
  const patternTitles: Record<MovementPattern, string> = { smooth: 'Smooth Sine Wave', zigzag: 'Zig-Zag Bounces', reactive: 'Reactive Shifts (Hard)' }
  return (
    <div className="lg:col-span-4 flex flex-col gap-4">
      <div className="bg-surface rounded-2xl p-5 border border-outline-variant/40 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">tune</span>
            <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-on-surface">Simulator Settings</h3>
          </div>
          <span className="text-[10px] text-outline uppercase font-body font-semibold">CONFIG</span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs"><label className="uppercase font-semibold tracking-wider text-outline">Target Shape</label><span className="text-secondary text-[11px] font-bold">{targetShape === 'sphere' ? 'Sphere (Orb)' : 'Cylinder (3D)'}</span></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setTargetShape('sphere')} className={`py-2 px-3 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition ${targetShape === 'sphere' ? 'bg-primary-container text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'}`} type="button"><span className="material-symbols-outlined text-[16px]">circle</span><span>Sphere</span></button>
            <button onClick={() => setTargetShape('cylinder')} className={`py-2 px-3 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition ${targetShape === 'cylinder' ? 'bg-primary-container text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'}`} type="button"><span className="material-symbols-outlined text-[16px]">view_column</span><span>Cylinder</span></button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs"><label className="uppercase font-semibold tracking-wider text-outline">Target Size</label><span className="text-secondary text-[11px] font-bold">{targetSize} px</span></div>
          <div className="grid grid-cols-3 gap-2">
            {[32, 55, 80].map((s) => (
              <button key={s} onClick={() => setTargetSize(s)} className={`py-1.5 rounded-lg text-xs uppercase text-center cursor-pointer transition ${targetSize === s ? 'bg-primary-container text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-medium'}`} type="button">
                {s === 32 ? 'Small (32px)' : s === 55 ? 'Med (55px)' : 'Large (80px)'}
              </button>
            ))}
          </div>
          <input className="w-full mt-1 accent-primary bg-surface-container-high h-1.5 rounded-lg cursor-pointer" max="100" min="20" type="range" value={targetSize} onChange={(e) => setTargetSize(parseInt(e.target.value, 10))} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs"><label className="uppercase font-semibold tracking-wider text-outline">Speed {activeTab === 'flick' ? '(Spawn)' : ''}</label><span className="text-tertiary text-[11px] font-bold">{speedMul.toFixed(1)}x {speedMul <= 0.6 ? '(Very Slow)' : speedMul <= 1.0 ? '(Slow)' : speedMul <= 1.8 ? '(Standard)' : speedMul < 3.5 ? '(Fast)' : '(Max Speed)'}</span></div>
          {activeTab === 'flick' && <p className="text-[11px] text-outline leading-tight">Controls how fast targets spawn and how long they live: ≤0.6 = ∞, 1.0 ≈1.8s, 3.5 ≈1.2s.</p>}
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: 0.4, label: '0.4x' },
              { v: 1.0, label: '1.0x' },
              { v: 2.0, label: '2.0x' },
              { v: 3.5, label: 'Max' },
            ].map((sp) => (
              <button
                key={sp.v}
                onClick={() => {
                  setSpeedMul(sp.v)
                  const s = stateRef.current
                  if (s) {
                    s.velX = (s.velX > 0 ? 1 : -1) * (2.0 * sp.v)
                    s.velY = (s.velY > 0 ? 1 : -1) * (1.6 * sp.v)
                  }
                }}
                className={`py-1.5 rounded-lg text-xs font-semibold uppercase text-center cursor-pointer transition ${Math.abs(speedMul - sp.v) < 0.05 ? 'bg-primary-container text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'}`}
                type="button"
              >
                {sp.label}
              </button>
            ))}
          </div>
          <input
            className="w-full mt-1 accent-primary bg-surface-container-high h-1.5 rounded-lg cursor-pointer"
            max="3.5"
            min="0.3"
            step="0.1"
            type="range"
            value={speedMul}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              setSpeedMul(v)
              const s = stateRef.current
              if (s) {
                s.velX = (s.velX === 0 ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(s.velX)) * (2.0 * v)
                s.velY = (s.velY === 0 ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(s.velY)) * (1.6 * v)
              }
            }}
          />
          <div className="flex justify-between text-[10px] text-outline">
            <span>Very Slow</span><span>Max Speed</span>
          </div>
        </div>

        {activeTab === 'tracking' ? (
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase font-semibold tracking-wider text-outline">Movement Pattern</label>
            <div className="flex flex-col gap-1.5">
              {(['smooth', 'zigzag', 'reactive'] as MovementPattern[]).map((p) => (
                <button key={p} onClick={() => setPattern(p)} className={`w-full p-2.5 rounded-lg text-xs text-left flex items-center justify-between border-l-4 cursor-pointer transition ${pattern === p ? 'bg-surface-container-high text-on-surface border-secondary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-transparent'}`} type="button">
                  <span className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[16px] ${pattern === p ? 'text-secondary' : p === 'reactive' ? 'text-error' : ''}`}>{p === 'smooth' ? 'waves' : p === 'zigzag' ? 'show_chart' : 'electric_bolt'}</span>
                    <span className="font-medium">{patternTitles[p]}</span>
                  </span>
                  <span className={pattern === p ? 'text-[10px] font-bold text-secondary uppercase' : 'text-[10px] text-outline uppercase'}>{pattern === p ? 'Active' : 'Select'}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-low rounded-xl p-3 border border-outline-variant/30">
            <p className="text-xs text-on-surface-variant leading-relaxed"><strong className="text-on-surface">Flick Shot</strong> — targets are stationary and spawn randomly. Higher speed means shorter lifetime and more spawns. Shoot before it disappears!</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs"><label className="uppercase font-semibold tracking-wider text-outline">Session Duration</label><span className="text-on-surface text-[11px] font-bold">{duration >= 9999 ? 'Free Play (Infinite)' : `${duration} Seconds`}</span></div>
          <div className="grid grid-cols-4 gap-2">
            {([15, 30, 60, 9999] as SessionDuration[]).map((d) => (
              <button key={d} onClick={() => setDuration(d)} className={`py-1.5 rounded-lg text-xs font-semibold uppercase text-center cursor-pointer transition ${duration === d ? 'bg-primary-container text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'}`} type="button">{d >= 9999 ? 'Free Play' : `${d}s`}</button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase font-semibold tracking-wider text-outline">Target Color Palette</label>
          <div className="grid grid-cols-4 gap-2">
            {(['cyan', 'emerald', 'purple', 'coral'] as TargetGlow[]).map((c) => (
              <button key={c} onClick={() => setGlow(c)} className={`h-8 rounded-lg flex items-center justify-center font-bold text-xs text-background transition cursor-pointer ${c === 'cyan' ? 'bg-secondary' : c === 'emerald' ? 'bg-tertiary' : c === 'purple' ? 'bg-primary' : 'bg-error'} ${glow === c ? 'ring-2 ring-white' : ''}`} type="button">
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-surface rounded-2xl p-4 border border-outline-variant/30 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-secondary text-lg">military_tech</span><h4 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface">PERSONAL RECORDS</h4></div>
          <span className="text-[10px] text-tertiary font-bold uppercase">LOCAL STORAGE</span>
        </div>
        {activeTab === 'tracking' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/30"><span className="text-[10px] uppercase tracking-wider text-outline font-semibold">BEST ACCURACY</span><div className="font-headline text-xl font-black text-tertiary mt-1">{bestTracking.acc ? `${bestTracking.acc.toFixed(1)}%` : '—'}</div><p className="text-[10px] text-outline mt-1">Tracking</p></div>
              <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/30"><span className="text-[10px] uppercase tracking-wider text-outline font-semibold">BEST TIME ON TARGET</span><div className="font-headline text-xl font-black text-primary mt-1">{bestTracking.tot ? `${bestTracking.tot.toFixed(1)}s` : '—'}</div><p className="text-[10px] text-outline mt-1">Consecutive Lock</p></div>
            </div>
            <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/30 flex items-center justify-between">
              <span className="text-xs text-outline">Total Tracking Sessions</span><span className="text-sm font-bold text-secondary font-headline">{totalTracking} SESSIONS</span>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/30"><span className="text-[10px] uppercase tracking-wider text-outline font-semibold">BEST HITS</span><div className="font-headline text-xl font-black text-primary mt-1">{bestFlick.hits ? `${bestFlick.hits}` : '—'}</div><p className="text-[10px] text-outline mt-1">Flick Shot</p></div>
              <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/30"><span className="text-[10px] uppercase tracking-wider text-outline font-semibold">BEST ACCURACY</span><div className="font-headline text-xl font-black text-tertiary mt-1">{bestFlick.acc ? `${bestFlick.acc.toFixed(1)}%` : '—'}</div><p className="text-[10px] text-outline mt-1">{bestFlick.avg != null ? `${Math.round(bestFlick.avg)}ms avg` : 'Flick'}</p></div>
            </div>
            <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/30 flex items-center justify-between">
              <span className="text-xs text-outline">Total Flick Sessions</span><span className="text-sm font-bold text-secondary font-headline">{totalFlick} SESSIONS</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
