export type TargetShape = 'sphere' | 'cylinder'
export type MovementPattern = 'smooth' | 'zigzag' | 'reactive'
export type TargetGlow = 'cyan' | 'emerald' | 'purple' | 'coral'
export type SessionDuration = 15 | 30 | 60 | 9999

export interface SessionRecord {
  id: string
  score: number
  accuracy: number
  onTargetSec: number
  pattern: MovementPattern
  size: number
  speed: number
  duration: number
  timestamp: number
}

export interface Settings {
  targetShape: TargetShape
  targetSize: number
  speedMul: number
  pattern: MovementPattern
  glow: TargetGlow
  duration: SessionDuration
}
