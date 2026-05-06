import { createInitialDeck, demoLevelConfig } from './level'
import type {
  GameState,
  PillarSlot,
  TableauColumn,
  WordCardModel,
} from './types'

const PILLAR_COUNT = 4

function idlePillar(): PillarSlot {
  return {
    lockedCategoryId: null,
    quotaRemaining: 0,
    quotaTotal: 0,
    tableau: { concealed: [], pile: [] },
  }
}

function peelIfEmpty(tab: TableauColumn): TableauColumn {
  if (tab.pile.length > 0 || tab.concealed.length === 0) return tab
  const [next, ...rest] = tab.concealed
  return { concealed: rest, pile: [next] }
}

function allTableauxEmpty(pillars: PillarSlot[]): boolean {
  return pillars.every(
    (p) => p.tableau.pile.length === 0 && p.tableau.concealed.length === 0,
  )
}

export function createInitialState(): GameState {
  const pillars: PillarSlot[] = Array.from({ length: PILLAR_COUNT }, () => idlePillar())

  return {
    config: demoLevelConfig,
    deck: createInitialDeck(),
    hand: null,
    pillars,
    movesLeft: demoLevelConfig.movesLimit,
    phase: 'playing',
    rejectPulse: 0,
    categoriesClearedOnce: 0,
  }
}

/** Apply level bootstrap tableaus after deal animation (deep copy cards). */
export function hydrateBootstrapTableaus(state: GameState): GameState {
  const boot = state.config.bootstrap.initialTableaus
  const pillars = state.pillars.map((p, i) => {
    const t = boot[i]
    if (!t) return p
    return {
      ...p,
      tableau: {
        concealed: t.concealed.map((w) => ({ ...w })),
        pile: t.pile.map((w) => ({ ...w })),
      },
    }
  })
  return { ...state, pillars }
}

function isWinning(state: GameState): boolean {
  if (state.deck.length > 0 || state.hand !== null) return false
  if (state.categoriesClearedOnce < 4) return false
  if (!allTableauxEmpty(state.pillars)) return false
  return state.pillars.every((p) => p.lockedCategoryId === null)
}

function bumpReject(state: GameState): GameState {
  return { ...state, rejectPulse: state.rejectPulse + 1 }
}

/** UI-only feedback (e.g. column drag missed slot). */
export function pulseReject(state: GameState): GameState {
  return bumpReject(state)
}

function afterMove(state: GameState): GameState {
  if (isWinning(state)) {
    return { ...state, phase: 'won' }
  }
  if (state.movesLeft <= 0) {
    return { ...state, phase: 'lost' }
  }
  return { ...state, phase: 'playing' }
}

/** After quota hits 0: reset slot header only; keep tableau column intact */
function applyCategoryComplete(
  state: GameState,
  pillarIndex: number,
): GameState {
  const nextPillars = state.pillars.map((p, i) =>
    i === pillarIndex
      ? {
          ...p,
          lockedCategoryId: null,
          quotaRemaining: 0,
          quotaTotal: 0,
        }
      : p,
  )
  return {
    ...state,
    pillars: nextPillars,
    categoriesClearedOnce: state.categoriesClearedOnce + 1,
  }
}

function depositWordsToSlot(
  state: GameState,
  pillarIndex: number,
  count: number,
): GameState {
  const p = state.pillars[pillarIndex]
  if (!p || p.lockedCategoryId === null) return state
  let quota = p.quotaRemaining - count
  let pillars = state.pillars.map((slot, i) => {
    if (i !== pillarIndex) return slot
    return { ...slot, quotaRemaining: Math.max(0, quota) }
  })
  let next: GameState = { ...state, pillars }
  const slot = pillars[pillarIndex]
  if (slot && slot.quotaRemaining <= 0) {
    next = applyCategoryComplete(next, pillarIndex)
  }
  return next
}

export function tryDraw(state: GameState): GameState {
  if (state.phase !== 'playing') return state
  if (state.hand !== null) return state
  if (state.deck.length === 0) return state

  const [next, ...rest] = state.deck
  return { ...state, deck: rest, hand: next }
}

/** Hand → slot header (category card or single word). */
export function tryHandDropOnSlot(
  state: GameState,
  pillarIndex: number,
): { state: GameState; ok: boolean; slotCleared?: boolean } {
  if (state.phase !== 'playing' || state.hand === null) {
    return { state, ok: false }
  }
  const pillar = state.pillars[pillarIndex]
  if (!pillar) return { state, ok: false }
  const card = state.hand

  if (card.kind === 'category') {
    if (pillar.lockedCategoryId !== null) {
      return { state: bumpReject(state), ok: false }
    }
    const nextPillars = state.pillars.map((p, i) =>
      i === pillarIndex
        ? {
            ...p,
            lockedCategoryId: card.categoryId,
            quotaRemaining: card.quota,
            quotaTotal: card.quota,
          }
        : p,
    )
    const next: GameState = {
      ...state,
      hand: null,
      pillars: nextPillars,
      movesLeft: state.movesLeft - 1,
    }
    return { state: afterMove(next), ok: true }
  }

  if (pillar.lockedCategoryId === null) {
    return { state: bumpReject(state), ok: false }
  }
  if (pillar.lockedCategoryId !== card.categoryId) {
    return { state: bumpReject(state), ok: false }
  }
  if (pillar.quotaRemaining < 1) {
    return { state: bumpReject(state), ok: false }
  }

  const prevQ = pillar.quotaRemaining
  let next: GameState = {
    ...state,
    hand: null,
    movesLeft: state.movesLeft - 1,
  }
  next = depositWordsToSlot(next, pillarIndex, 1)
  const cleared = prevQ <= 1
  return { state: afterMove(next), ok: true, slotCleared: cleared }
}

/** Hand word → tableau: merge under anchor (pile[0]) if same category. */
export function tryHandMergeTableau(
  state: GameState,
  pillarIndex: number,
): { state: GameState; ok: boolean } {
  if (state.phase !== 'playing' || state.hand === null) {
    return { state, ok: false }
  }
  const hand = state.hand
  if (hand.kind !== 'word') return { state: bumpReject(state), ok: false }

  const pillar = state.pillars[pillarIndex]
  if (!pillar) return { state, ok: false }
  const { pile, concealed } = pillar.tableau
  if (pile.length === 0) {
    return { state: bumpReject(state), ok: false }
  }
  if (hand.categoryId !== pile[0].categoryId) {
    return { state: bumpReject(state), ok: false }
  }

  const newPile: WordCardModel[] = [hand, ...pile]
  const nextPillars = state.pillars.map((p, i) =>
    i === pillarIndex ? { ...p, tableau: { concealed, pile: newPile } } : p,
  )
  const next: GameState = {
    ...state,
    hand: null,
    pillars: nextPillars,
    movesLeft: state.movesLeft - 1,
  }
  return { state: afterMove(next), ok: true }
}

/** Whole face-up tableau chain from `fromPillarIndex` → locked slot on `toPillarIndex`. */
export function tryTableauChainToSlot(
  state: GameState,
  fromPillarIndex: number,
  toPillarIndex: number,
): { state: GameState; ok: boolean; slotCleared?: boolean } {
  if (state.phase !== 'playing') {
    return { state, ok: false }
  }
  const fromPillar = state.pillars[fromPillarIndex]
  const toPillar = state.pillars[toPillarIndex]
  if (!fromPillar || !toPillar) return { state, ok: false }
  if (toPillar.lockedCategoryId === null) {
    return { state: bumpReject(state), ok: false }
  }

  const { pile, concealed } = fromPillar.tableau
  if (pile.length === 0) return { state: bumpReject(state), ok: false }
  const cat = toPillar.lockedCategoryId
  if (!pile.every((w) => w.categoryId === cat)) {
    return { state: bumpReject(state), ok: false }
  }
  if (toPillar.quotaRemaining < pile.length) {
    return { state: bumpReject(state), ok: false }
  }

  const prevQ = toPillar.quotaRemaining
  const count = pile.length
  let next: GameState = {
    ...state,
    movesLeft: state.movesLeft - 1,
    pillars: state.pillars.map((p, i) => {
      if (i === fromPillarIndex) {
        return {
          ...p,
          tableau: peelIfEmpty({ concealed, pile: [] }),
        }
      }
      return p
    }),
  }
  next = depositWordsToSlot(next, toPillarIndex, count)
  const cleared = prevQ <= count
  return { state: afterMove(next), ok: true, slotCleared: cleared }
}

export function categoryLabel(
  state: GameState,
  categoryId: string,
): string {
  const cat = state.config.categories.find((c) => c.id === categoryId)
  return cat?.label ?? categoryId
}

export function categoryHue(state: GameState, categoryId: string): number {
  const cat = state.config.categories.find((c) => c.id === categoryId)
  return cat?.hue ?? 200
}
