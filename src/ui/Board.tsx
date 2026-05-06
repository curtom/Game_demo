import type { GameState } from '../game/types'
import { HandCard } from './HandCard'
import { Pillar } from './Pillar'

type BoardProps = {
  state: GameState
  registerPillarEl: (index: number, el: HTMLDivElement | null) => void
  resolveHandDrop: (x: number, y: number) => void
  onColumnChainFinish: (pillarIndex: number, x: number, y: number) => void
  categoryLabel: (id: string) => string
  categoryHue: (id: string) => number
  resolveCategoryLabel: (id: string) => string
  inputLocked: boolean
  flashPillarIndex: number | null
}

export function Board({
  state,
  registerPillarEl,
  resolveHandDrop,
  onColumnChainFinish,
  categoryLabel,
  categoryHue,
  resolveCategoryLabel,
  inputLocked,
  flashPillarIndex,
}: BoardProps) {
  const veil = inputLocked || state.phase !== 'playing'
  const overlay = veil ? <div className="board__veil" aria-hidden /> : null

  const columnChainPlayable = state.phase === 'playing' && !inputLocked

  return (
    <section className="board">
      {overlay}

      <div className="board__pillars">
        {state.pillars.map((pillar, idx) => (
          <Pillar
            key={idx}
            index={idx}
            pillar={pillar}
            registerEl={registerPillarEl}
            categoryLabel={categoryLabel}
            categoryHue={categoryHue}
            successFlash={flashPillarIndex === idx}
            columnChainPlayable={columnChainPlayable}
            rejectVersion={state.rejectPulse}
            onColumnChainFinish={onColumnChainFinish}
          />
        ))}
      </div>

      <div className="board__staging">
        <HandCard
          card={state.hand}
          playable={
            state.phase === 'playing' && !inputLocked && state.hand !== null
          }
          rejectVersion={state.rejectPulse}
          onDropAtScreen={resolveHandDrop}
          resolveCategoryLabel={resolveCategoryLabel}
        />
      </div>
    </section>
  )
}
