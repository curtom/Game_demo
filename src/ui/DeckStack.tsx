import { forwardRef } from 'react'

type DeckStackProps = {
  count: number
  dimmed: boolean
  onDraw: () => void
  disabled: boolean
}

export const DeckStack = forwardRef<HTMLButtonElement, DeckStackProps>(
  function DeckStack({ count, dimmed, onDraw, disabled }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={['deck', dimmed ? 'deck--dim' : ''].filter(Boolean).join(' ')}
        onClick={onDraw}
        disabled={disabled}
        aria-label={`Draw from deck, ${count} cards remaining`}
      >
        <span className="deck__stack" aria-hidden>
          <span className="deck__layer deck__layer--3" />
          <span className="deck__layer deck__layer--2" />
          <span className="deck__layer deck__layer--1" />
        </span>
        <span className="deck__count">{count}</span>
      </button>
    )
  },
)
