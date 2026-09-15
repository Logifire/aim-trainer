export type TargetShape = 'sphere' | 'cylinder'
export type MovementPattern = 'smooth' | 'zigzag' | 'reactive'
export type TargetGlow = 'cyan' | 'emerald' | 'purple' | 'coral'
export type SessionDuration = 15 | 30 | 60 | 9999
export type GameMode = 'tracking' | 'flick'

export interface SessionRecord {
  id: string
  mode?: 'tracking'
  score: number
  accuracy: number
  onTargetSec: number
  pattern: MovementPattern
  size: number
  speed: number
  duration: number
  timestamp: number
}

export interface FlickRecord {
  id: string
  mode: 'flick'
  hits: number
  shots: number
  accuracy: number
  avgReactionMs: number | null
  size: number
  speed: number
  duration: number
  timestamp: number
}

export type AnyRecord = SessionRecord | FlickRecord

export interface Settings {
  targetShape: TargetShape
  targetSize: number
  speedMul: number
  pattern: MovementPattern
  glow: TargetGlow
  duration: SessionDuration
}
