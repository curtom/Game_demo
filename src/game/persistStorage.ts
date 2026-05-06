import { demoLevelConfig } from './level'
import type { GameState } from './types'

const STORAGE_KEY = 'game_demo_save_v1'
const SAVE_VERSION = 1

/** 关卡变更时 bump，旧存档自动失效 */
export const SAVE_LEVEL_ID = 'demo-2026-v1'

export type PersistedPayload = {
  v: typeof SAVE_VERSION
  levelId: string
  dealReady: boolean
  gameState: GameState
}

function isGameState(x: unknown): x is GameState {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.phase === 'string' &&
    ['playing', 'won', 'lost'].includes(o.phase as string) &&
    Array.isArray(o.pillars) &&
    o.pillars.length === 4 &&
    Array.isArray(o.deck) &&
    o.config !== null &&
    typeof o.config === 'object' &&
    typeof o.movesLeft === 'number' &&
    typeof o.categoriesClearedOnce === 'number' &&
    (o.hand === null || typeof o.hand === 'object')
  )
}

export function loadGameSnapshot(): PersistedPayload | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as PersistedPayload
    if (p.v !== SAVE_VERSION || p.levelId !== SAVE_LEVEL_ID) return null
    if (typeof p.dealReady !== 'boolean') return null
    if (!isGameState(p.gameState)) return null
    if (p.gameState.config.title !== demoLevelConfig.title) return null
    if (p.gameState.config.movesLimit !== demoLevelConfig.movesLimit) return null
    return p
  } catch {
    return null
  }
}

export function saveGameSnapshot(gameState: GameState, dealReady: boolean) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const payload: PersistedPayload = {
      v: SAVE_VERSION,
      levelId: SAVE_LEVEL_ID,
      dealReady,
      gameState,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* 存储配额或无痕模式 */
  }
}

export function clearGameSnapshot() {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
