import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'

import {
  playCategoryComplete,
  playError,
  playPlaceSuccess,
  playWinFanfare,
} from '../audio/gameSounds'
import { vibrateError } from '../fx/haptics'
import {
  categoryHue,
  categoryLabel,
  createInitialState,
  hydrateBootstrapTableaus,
  pulseReject,
  tryDraw,
  tryHandDropOnSlot,
  tryHandMergeTableau,
  tryTableauChainToSlot,
} from '../game/gameModel'
import { clearGameSnapshot, loadGameSnapshot, saveGameSnapshot } from '../game/persistStorage'
import type { GameState } from '../game/types'
import { Board } from './Board'
import { DealIntro } from './DealIntro'
import { DeckStack } from './DeckStack'
import { RulesPopup } from './RulesPopup'
import { WinCelebration } from './WinCelebration'

const PILLAR_COUNT = 4
const DEAL_CARDS_PER_PILLAR = 3

type Action =
  | { type: 'draw' }
  | { type: 'setState'; state: GameState }
  | { type: 'reset' }

function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'draw':
      return tryDraw(state)
    case 'setState':
      return action.state
    case 'reset':
      return createInitialState()
    default:
      return state
  }
}

function rectPad(
  r: DOMRect,
  pad: number,
): { L: number; R: number; T: number; B: number } {
  return {
    L: r.left - pad,
    R: r.right + pad,
    T: r.top - pad,
    B: r.bottom + pad,
  }
}

function inside(
  r: DOMRect,
  x: number,
  y: number,
  pad: number,
): boolean {
  const p = rectPad(r, pad)
  return x >= p.L && x <= p.R && y >= p.T && y <= p.B
}

function area(r: DOMRect): number {
  return r.width * r.height
}

function allPillarsTableauEmpty(state: GameState): boolean {
  return state.pillars.every(
    (p) => p.tableau.concealed.length === 0 && p.tableau.pile.length === 0,
  )
}

export function GameScreen() {
  const boot = useMemo(() => {
    const snap = loadGameSnapshot()
    return {
      state: snap?.gameState ?? createInitialState(),
      dealReady: snap?.dealReady ?? false,
      /** 仅用于首次挂载：恢复时若已发过牌则跳过飞牌动画 */
      resumeSkipDeal: snap?.dealReady === true,
    }
  }, [])

  const [state, dispatch] = useReducer(reduce, boot.state)
  const stateRef = useRef(state)
  stateRef.current = state

  const deckBtnRef = useRef<HTMLButtonElement>(null)
  const pillarRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const [dealKey, setDealKey] = useState(0)
  const [dealReady, setDealReady] = useState(boot.dealReady)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [flashPillar, setFlashPillar] = useState<number | null>(null)

  const closeRules = useCallback(() => setRulesOpen(false), [])

  useEffect(() => {
    saveGameSnapshot(state, dealReady)
  }, [state, dealReady])
  const registerPillarEl = useCallback((index: number, el: HTMLDivElement | null) => {
    if (!el) {
      pillarRefs.current.delete(index)
      return
    }
    pillarRefs.current.set(index, el)
  }, [])

  const getPillarStackRect = useCallback((pillarIndex: number) => {
    const el = pillarRefs.current.get(pillarIndex)
    const tab = el?.querySelector('.pillar__tableau')
    return tab?.getBoundingClientRect() ?? el?.getBoundingClientRect() ?? null
  }, [])

  const hitTestPillarTargets = useCallback(
    (clientX: number, clientY: number, pad: number) => {
      type Hit = { kind: 'slot' | 'tableau'; idx: number; area: number }
      const hits: Hit[] = []
      for (const [idx, root] of pillarRefs.current) {
        const slotEl = root.querySelector('[data-hit="slot"]')
        if (slotEl) {
          const sr = slotEl.getBoundingClientRect()
          if (inside(sr, clientX, clientY, pad)) {
            hits.push({ kind: 'slot', idx, area: area(sr) })
          }
        }
        const tabEl = root.querySelector('[data-hit="tableau"]')
        if (tabEl) {
          const tr = tabEl.getBoundingClientRect()
          if (inside(tr, clientX, clientY, pad)) {
            hits.push({ kind: 'tableau', idx, area: area(tr) })
          }
        }
      }
      const slots = hits.filter((h) => h.kind === 'slot')
      if (slots.length) {
        slots.sort((a, b) => a.area - b.area)
        return slots[0]
      }
      const tabs = hits.filter((h) => h.kind === 'tableau')
      tabs.sort((a, b) => a.area - b.area)
      return tabs[0] ?? null
    },
    [],
  )

  /** Smallest slot rect under point (for cross-column chain drop). */
  const pickSlotUnder = useCallback((clientX: number, clientY: number, pad: number) => {
    let best: { idx: number; area: number } | null = null
    for (const [idx, root] of pillarRefs.current) {
      const slotEl = root.querySelector('[data-hit="slot"]')
      if (!slotEl) continue
      const sr = slotEl.getBoundingClientRect()
      if (!inside(sr, clientX, clientY, pad)) continue
      const ar = area(sr)
      if (!best || ar < best.area) best = { idx, area: ar }
    }
    return best?.idx ?? null
  }, [])

  const onSuccessFx = useCallback((pillarIndex: number, slotCleared?: boolean) => {
    playPlaceSuccess()
    setFlashPillar(pillarIndex)
    window.setTimeout(() => setFlashPillar(null), 560)
    if (slotCleared) {
      window.setTimeout(() => playCategoryComplete(), 140)
    }
  }, [])

  const resolveHandDrop = useCallback(
    (clientX: number, clientY: number) => {
      const hit = hitTestPillarTargets(clientX, clientY, 10)
      if (!hit) return

      const cur = stateRef.current
      if (hit.kind === 'slot') {
        const { state: next, ok, slotCleared } = tryHandDropOnSlot(cur, hit.idx)
        dispatch({ type: 'setState', state: next })
        if (!ok) {
          playError()
          vibrateError()
          setRulesOpen(true)
          return
        }
        onSuccessFx(hit.idx, slotCleared)
        if (next.phase === 'won') {
          window.setTimeout(() => playWinFanfare(), 480)
        }
        return
      }

      const { state: next, ok } = tryHandMergeTableau(cur, hit.idx)
      dispatch({ type: 'setState', state: next })
      if (!ok) {
        playError()
        vibrateError()
        setRulesOpen(true)
        return
      }
      onSuccessFx(hit.idx, false)
      if (next.phase === 'won') {
        window.setTimeout(() => playWinFanfare(), 480)
      }
    },
    [hitTestPillarTargets, onSuccessFx],
  )

  const onColumnChainFinish = useCallback(
    (fromPillarIndex: number, clientX: number, clientY: number) => {
      const targetIdx = pickSlotUnder(clientX, clientY, 14)
      if (targetIdx === null) {
        dispatch({ type: 'setState', state: pulseReject(stateRef.current) })
        playError()
        vibrateError()
        setRulesOpen(true)
        return
      }

      const cur = stateRef.current
      const { state: next, ok, slotCleared } = tryTableauChainToSlot(
        cur,
        fromPillarIndex,
        targetIdx,
      )
      dispatch({ type: 'setState', state: next })
      if (!ok) {
        playError()
        vibrateError()
        setRulesOpen(true)
        return
      }
      onSuccessFx(targetIdx, slotCleared)
      if (next.phase === 'won') {
        window.setTimeout(() => playWinFanfare(), 480)
      }
    },
    [onSuccessFx, pickSlotUnder],
  )

  const deckCount = state.deck.length
  const canInteract = state.phase === 'playing' && dealReady
  const canDraw = canInteract && state.hand === null && state.deck.length > 0

  const handleReset = () => {
    clearGameSnapshot()
    dispatch({ type: 'reset' })
    setDealReady(false)
    setDealKey((k) => k + 1)
    setRulesOpen(false)
    setFlashPillar(null)
  }

  const handleDealComplete = useCallback(() => {
    const s = stateRef.current
    if (allPillarsTableauEmpty(s)) {
      dispatch({
        type: 'setState',
        state: hydrateBootstrapTableaus(s),
      })
    }
    setDealReady(true)
  }, [])

  return (
    <div className="shell">
      <DealIntro
        dealKey={dealKey}
        pillarCount={PILLAR_COUNT}
        cardsPerPillar={DEAL_CARDS_PER_PILLAR}
        deckRef={deckBtnRef}
        getPillarStackRect={getPillarStackRect}
        onComplete={handleDealComplete}
        skipAnimation={boot.resumeSkipDeal && dealKey === 0}
      />

      <header className="topBar">
        <div>
          <h1 className="title">{state.config.title}</h1>
          <p className="subtitle">
            每列槽下 3 张牌（2 背 1 明）。整串明牌可拖到<strong>任意列已解锁的卡槽</strong>（主题一致且进度足够）。
          </p>
        </div>
        <div className="stats">
          <div className="pill stat">
            步数 <strong>{Math.max(0, state.movesLeft)}</strong>
          </div>
          <div className="pill stat subtle">
            已完成主题 <strong>{state.categoriesClearedOnce}</strong> / 4
          </div>
          <button type="button" className="btn ghost" onClick={handleReset}>
            重开
          </button>
        </div>
      </header>

      {state.phase === 'lost' && (
        <div className="toast toast--lose" role="alert">
          步数用尽——可以点「重开」再试一局。
        </div>
      )}

      <Board
        state={state}
        registerPillarEl={registerPillarEl}
        resolveHandDrop={resolveHandDrop}
        onColumnChainFinish={onColumnChainFinish}
        categoryLabel={(id) => categoryLabel(state, id)}
        categoryHue={(id) => categoryHue(state, id)}
        resolveCategoryLabel={(id) => categoryLabel(state, id)}
        inputLocked={!canInteract}
        flashPillarIndex={flashPillar}
      />

      <footer className="foot">
        <DeckStack
          ref={deckBtnRef}
          count={deckCount}
          dimmed={!canDraw}
          disabled={!canDraw}
          onDraw={() => dispatch({ type: 'draw' })}
        />
        {canDraw && <p className="hint">点击牌堆翻出下一张。</p>}
        {!dealReady && <p className="hint hint--subtle">发牌动画进行中…</p>}
      </footer>

      <RulesPopup open={rulesOpen} onClose={closeRules} />

      <WinCelebration open={state.phase === 'won'} onPlayAgain={handleReset} />
    </div>
  )
}
