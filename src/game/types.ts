export type CategoryId = string

export interface CategoryBlueprint {
  id: CategoryId
  label: string
  hue: number
}

/** Category drawn from deck: carries required word matches before slot clears */
export interface CategoryCardModel {
  kind: 'category'
  cardId: string
  categoryId: CategoryId
  quota: number
}

export interface WordCardModel {
  kind: 'word'
  cardId: string
  text: string
  categoryId: CategoryId
}

export type PlayingCardModel = CategoryCardModel | WordCardModel

/** Column under each slot — ref style: concealed[0] is next to uncover; pile[0]=deepest merged (closest to viewport bottom); pile[end]=top face-up attaching toward slot */
export interface TableauColumn {
  concealed: WordCardModel[]
  pile: WordCardModel[]
}

export interface PillarSlot {
  lockedCategoryId: CategoryId | null
  /** Remaining placements needed onto this slot to complete category */
  quotaRemaining: number
  /** Copies category card quota for UI */
  quotaTotal: number
  /** After clearing, pillar is idle until player places another category */
  tableau: TableauColumn
}

export type Phase = 'playing' | 'won' | 'lost'

export interface LevelBootstrap {
  initialTableaus: TableauColumn[]
}

export interface GameConfig {
  title: string
  movesLimit: number
  categories: CategoryBlueprint[]
  bootstrap: LevelBootstrap
}

export interface GameState {
  config: GameConfig
  deck: PlayingCardModel[]
  hand: PlayingCardModel | null
  pillars: PillarSlot[]
  movesLeft: number
  phase: Phase
  rejectPulse: number
  categoriesClearedOnce: number
}
