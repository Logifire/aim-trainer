import type { GameMode } from '../types'

interface Props {
  active: GameMode
  onChange: (m: GameMode) => void
}

export function Tabs({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 bg-surface rounded-xl p-1 border border-outline-variant/30 w-fit">
      <button
        onClick={() => onChange('tracking')}
        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
          active === 'tracking'
            ? 'bg-primary-container text-on-primary shadow'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
        }`}
        type="button"
      >
        <span className="material-symbols-outlined text-[18px]">my_location</span>
        Tracking
      </button>
      <button
        onClick={() => onChange('flick')}
        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
          active === 'flick'
            ? 'bg-primary-container text-on-primary shadow'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
        }`}
        type="button"
      >
        <span className="material-symbols-outlined text-[18px]">ads_click</span>
        Flick Shot
      </button>
    </div>
  )
}
