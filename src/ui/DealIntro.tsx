import { Fragment, useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react'

import { playDealTick } from '../audio/gameSounds'

const CARD_W = 52
const CARD_H = 74
const FLIGHT_MS = 520
const PAUSE_AFTER_MS = 280

export type DealIntroProps = {
  dealKey: number
  pillarCount: number
  cardsPerPillar: number
  deckRef: RefObject<HTMLButtonElement | null>
  getPillarStackRect: (pillarIndex: number) => DOMRect | null
  onComplete: () => void
  /** 从本地恢复且已发过牌：跳过飞牌，避免重复把 bootstrap 写回桌面 */
  skipAnimation?: boolean
}

type Shot = {
  key: string
  sx: number
  sy: number
  dx: number
  dy: number
  delay: number
}

function buildShots(
  dealKey: number,
  pillarCount: number,
  cardsPerPillar: number,
  deck: DOMRect,
  getPillarStackRect: (pillarIndex: number) => DOMRect | null,
): Shot[] {
  let id = 0
  const list: Shot[] = []
  let delayAcc = 0
  const step = 78

  for (let pillar = 0; pillar < pillarCount; pillar++) {
    const rect = getPillarStackRect(pillar)
    if (!rect) continue
    const startX = deck.left + deck.width / 2 - CARD_W / 2
    const startY = deck.top + deck.height / 2 - CARD_H / 2
    for (let k = 0; k < cardsPerPillar; k++) {
      const jitterX = pillar * 1.8 + k * 2
      const jitterY = -k * 4.5
      const targetX = rect.left + rect.width / 2 - CARD_W / 2 + jitterX
      const targetY = rect.bottom - CARD_H - 10 + jitterY
      list.push({
        key: `d-${dealKey}-${id}`,
        sx: startX,
        sy: startY,
        dx: targetX - startX,
        dy: targetY - startY,
        delay: delayAcc,
      })
      id += 1
      delayAcc += step
    }
  }

  return list
}

export function DealIntro({
  dealKey,
  pillarCount,
  cardsPerPillar,
  deckRef,
  getPillarStackRect,
  onComplete,
  skipAnimation = false,
}: DealIntroProps) {
  const [shots, setShots] = useState<Shot[]>([])

  useLayoutEffect(() => {
    if (skipAnimation) {
      let cancelled = false
      const id = window.requestAnimationFrame(() => {
        if (!cancelled) onComplete()
      })
      return () => {
        cancelled = true
        window.cancelAnimationFrame(id)
      }
    }

    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []

    const done = () => {
      if (cancelled) return
      onComplete()
    }

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      const id = window.requestAnimationFrame(() => done())
      return () => {
        cancelled = true
        window.cancelAnimationFrame(id)
      }
    }

    const start = (attempt: number) => {
      if (cancelled) return
      const deck = deckRef.current?.getBoundingClientRect()
      if (!deck || deck.width < 4 || deck.height < 4) {
        if (attempt < 36) {
          requestAnimationFrame(() => start(attempt + 1))
        } else {
          done()
        }
        return
      }

      const list = buildShots(
        dealKey,
        pillarCount,
        cardsPerPillar,
        deck,
        getPillarStackRect,
      )

      if (list.length === 0 && attempt < 36) {
        requestAnimationFrame(() => start(attempt + 1))
        return
      }

      if (list.length === 0) {
        done()
        return
      }

      for (const s of list) {
        timers.push(
          window.setTimeout(() => playDealTick(), s.delay + 35),
        )
      }
      setShots(list)
      const total =
        Math.max(...list.map((s) => s.delay)) + FLIGHT_MS + PAUSE_AFTER_MS
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return
          setShots([])
          done()
        }, total),
      )
    }

    requestAnimationFrame(() => requestAnimationFrame(() => start(0)))

    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
      setShots([])
    }
  }, [
    skipAnimation,
    dealKey,
    pillarCount,
    cardsPerPillar,
    deckRef,
    getPillarStackRect,
    onComplete,
  ])

  return (
    <Fragment>
      {shots.map((s) => (
        <div
          key={s.key}
          className="dealFly"
          style={
            {
              left: s.sx,
              top: s.sy,
              width: CARD_W,
              height: CARD_H,
              '--dx': `${s.dx}px`,
              '--dy': `${s.dy}px`,
              animationDelay: `${s.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </Fragment>
  )
}
