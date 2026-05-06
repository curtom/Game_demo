import type {
  CategoryBlueprint,
  CategoryCardModel,
  GameConfig,
  PlayingCardModel,
  TableauColumn,
  WordCardModel,
} from './types'

const categories: CategoryBlueprint[] = [
  { id: 'nature', label: 'Natural world', hue: 142 },
  { id: 'food', label: 'Things you eat', hue: 32 },
  { id: 'motion', label: 'Ways to move', hue: 210 },
  { id: 'emotion', label: 'Feelings', hue: 288 },
]

/** Column: pile[0] = deepest / face-up anchor at bottom; concealed[0] sits just above pile. */
function col(bottom: WordCardModel, mid: WordCardModel, top: WordCardModel): TableauColumn {
  return {
    concealed: [mid, top],
    pile: [bottom],
  }
}

/** 4 pillars × 3 words (12) on table; 4 “fourth” words start in deck. */
function bootstrapTableaus(words: ReturnType<typeof makeWords>): TableauColumn[] {
  const w = words
  return [
    col(w.river, w.thunder, w.forest),
    col(w.noodle, w.mango, w.bagel),
    col(w.sprint, w.glide, w.rowing),
    col(w.joy, w.calm, w.wonder),
  ]
}

function makeWords(makeId: () => string) {
  const id = makeId
  const word = (text: string, categoryId: string): WordCardModel => ({
    kind: 'word',
    cardId: id(),
    text,
    categoryId,
  })
  return {
    river: word('River', 'nature'),
    thunder: word('Thunder', 'nature'),
    forest: word('Forest', 'nature'),
    aurora: word('Aurora', 'nature'),
    noodle: word('Noodle', 'food'),
    mango: word('Mango', 'food'),
    bagel: word('Bagel', 'food'),
    mochi: word('Mochi', 'food'),
    sprint: word('Sprint', 'motion'),
    glide: word('Glide', 'motion'),
    rowing: word('Rowing', 'motion'),
    pedal: word('Pedal', 'motion'),
    joy: word('Joy', 'emotion'),
    calm: word('Calm', 'emotion'),
    wonder: word('Wonder', 'emotion'),
    pride: word('Pride', 'emotion'),
  }
}

/** Top of deck index 0 = drawn first. */
function buildDeck(words: ReturnType<typeof makeWords>): PlayingCardModel[] {
  const w = words
  const cat = (categoryId: CategoryBlueprint['id'], cardId: string, quota: number): CategoryCardModel => ({
    kind: 'category',
    cardId,
    categoryId,
    quota,
  })
  return [
    cat('nature', 'cat-n', 4),
    w.aurora,
    cat('food', 'cat-f', 4),
    w.mochi,
    cat('motion', 'cat-m', 4),
    w.pedal,
    cat('emotion', 'cat-e', 4),
    w.pride,
  ]
}

let idN = 0
const id = () => `c${++idN}`
const words = makeWords(id)

export const demoLevelConfig: GameConfig = {
  title: 'Demo — Solitaire Sort',
  movesLimit: 42,
  categories,
  bootstrap: {
    initialTableaus: bootstrapTableaus(words),
  },
}

export function createInitialDeck(): PlayingCardModel[] {
  return buildDeck(words)
}
