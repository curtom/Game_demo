import type { CSSProperties } from 'react'

type WinCelebrationProps = {
  open: boolean
  onPlayAgain: () => void
}

export function WinCelebration({ open, onPlayAgain }: WinCelebrationProps) {
  if (!open) return null

  return (
    <div className="winOverlay" role="dialog" aria-modal="true" aria-label="通关">
      <div className="winConfetti" aria-hidden>
        {Array.from({ length: 34 }, (_, i) => {
          const spread = (i * 0.6180339887) % 1
          const angle = spread * Math.PI * 2
          const dist = 110 + (i % 7) * 26
          const tx = Math.cos(angle) * dist
          const ty = Math.sin(angle) * dist - 150
          return (
            <span
              key={i}
              className={`winConfetti__bit winConfetti__bit--${i % 6}`}
              style={
                {
                  '--tx': `${Math.round(tx)}px`,
                  '--ty': `${Math.round(ty)}px`,
                  '--t': `${0.55 + (i % 9) * 0.05}s`,
                } as CSSProperties
              }
            />
          )
        })}
      </div>
      <div className="winCard">
        <p className="winCard__kicker">All matched</p>
        <h2 className="winCard__title">全部归类完成</h2>
        <p className="winCard__sub">干得漂亮——牌桌已经收拾干净了。</p>
        <button type="button" className="btn primary" onClick={onPlayAgain}>
          再玩一局
        </button>
      </div>
    </div>
  )
}
