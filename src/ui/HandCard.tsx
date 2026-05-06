import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'

import type { PlayingCardModel } from '../game/types'

type Props = {
  card: PlayingCardModel | null
  playable: boolean
  rejectVersion: number
  onDropAtScreen: (clientX: number, clientY: number) => void
  resolveCategoryLabel: (categoryId: string) => string
}

export function HandCard({
  card,
  playable,
  rejectVersion,
  onDropAtScreen,
  resolveCategoryLabel,
}: Props) {
  const innerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const grabRef = useRef({ gx: 0, gy: 0 })
  const tiltOriginXRef = useRef(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const activePointerIdRef = useRef<number | null>(null)
  const windowDragCleanupRef = useRef<(() => void) | null>(null)
  const [lift, setLift] = useState(false)
  const [floatPt, setFloatPt] = useState<{ left: number; top: number } | null>(
    null,
  )
  const [spacer, setSpacer] = useState<{ w: number; h: number } | null>(null)

  const detachWindowListeners = useCallback(() => {
    windowDragCleanupRef.current?.()
    windowDragCleanupRef.current = null
    activePointerIdRef.current = null
  }, [])

  useEffect(() => () => detachWindowListeners(), [detachWindowListeners])

  useEffect(() => {
    if (!card) {
      draggingRef.current = false
      detachWindowListeners()
      setOffset({ x: 0, y: 0 })
      setLift(false)
      setFloatPt(null)
      setSpacer(null)
    }
  }, [card, detachWindowListeners])

  useEffect(() => {
    const el = innerRef.current
    if (!el || rejectVersion === 0) return
    el.classList.remove('handCard__sheet--shake')
    void el.getBoundingClientRect()
    el.classList.add('handCard__sheet--shake')
    const t = window.setTimeout(() => {
      el.classList.remove('handCard__sheet--shake')
    }, 420)
    return () => window.clearTimeout(t)
  }, [rejectVersion])

  const finishFromWindow = useCallback(
    (e: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>) => {
      const pid = activePointerIdRef.current
      if (pid !== null && e.pointerId !== pid) return false
      detachWindowListeners()
      const wasDrag = draggingRef.current
      draggingRef.current = false
      setLift(false)
      setFloatPt(null)
      setSpacer(null)
      if (wasDrag && card) {
        onDropAtScreen(e.clientX, e.clientY)
      }
      setOffset({ x: 0, y: 0 })
      return true
    },
    [card, detachWindowListeners, onDropAtScreen],
  )

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!playable || !card || e.button !== 0) return
      e.preventDefault()
      draggingRef.current = true
      setLift(true)
      const pid = e.pointerId
      activePointerIdRef.current = pid
      const rect = e.currentTarget.getBoundingClientRect()
      grabRef.current = {
        gx: e.clientX - rect.left,
        gy: e.clientY - rect.top,
      }
      tiltOriginXRef.current = e.clientX
      setFloatPt({ left: rect.left, top: rect.top })
      setSpacer({ w: rect.width, h: rect.height })
      setOffset({ x: 0, y: 0 })

      detachWindowListeners()
      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pid) return
        if (!draggingRef.current) return
        setOffset({
          x: ev.clientX - tiltOriginXRef.current,
          y: 0,
        })
        setFloatPt({
          left: ev.clientX - grabRef.current.gx,
          top: ev.clientY - grabRef.current.gy,
        })
      }
      const onEnd = (ev: PointerEvent) => {
        if (ev.pointerId !== pid) return
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onEnd)
        window.removeEventListener('pointercancel', onEnd)
        windowDragCleanupRef.current = null
        finishFromWindow(ev)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onEnd)
      window.addEventListener('pointercancel', onEnd)
      windowDragCleanupRef.current = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onEnd)
        window.removeEventListener('pointercancel', onEnd)
      }
    },
    [card, detachWindowListeners, finishFromWindow, playable],
  )

  if (!card) {
    return (
      <div className="handSlot handSlot--empty">
        <span className="handSlot__label">Hand</span>
      </div>
    )
  }

  const isCategory = card.kind === 'category'
  const categoryTitle = isCategory
    ? resolveCategoryLabel(card.categoryId)
    : ''

  const dragRotateDeg = lift ? Math.max(-4, Math.min(4, offset.x * 0.04)) : 0
  const floated = Boolean(lift && spacer && floatPt)

  /** 与设计稿一致：卡牌仅为白底圆角矩形；分类/单词共用同一外框尺寸 */
  const sheetClass = 'handCard__sheet'

  const cardInner = isCategory ? (
    <>
      <span className="handCard__eyebrow">分类卡</span>
      <strong className="handCard__primary">{categoryTitle}</strong>
      <span className="handCard__secondary">
        需匹配{' '}
        {'quota' in card ? card.quota : 0}{' '}
        张单词后结算 · 拖到空槽
      </span>
    </>
  ) : (
    <>
      <span className="handCard__eyebrow">单词</span>
      <strong className="handCard__primary">{card.text}</strong>
      <span className="handCard__secondary">
        拖到卡槽或与同主题明牌贴合
      </span>
    </>
  )

  const cardClasses = [
    'handCard',
    isCategory ? 'handCard--category' : 'handCard--word',
    lift ? 'handCard--lift' : '',
    'handCard--deal',
  ]
    .filter(Boolean)
    .join(' ')

  const gx = grabRef.current.gx
  const gy = grabRef.current.gy

  const ghostStyle: CSSProperties = floated
    ? {
        position: 'fixed',
        left: floatPt!.left,
        top: floatPt!.top,
        width: spacer!.w,
        zIndex: 'var(--drag-layer-z)',
        transform: `rotate(${dragRotateDeg}deg)`,
        transformOrigin: `${gx}px ${gy}px`,
        pointerEvents: 'none',
      }
    : {}

  const ghostCard = floated ? (
    <div className={cardClasses} style={ghostStyle}>
      <div className={sheetClass}>{cardInner}</div>
    </div>
  ) : null

  return (
    <>
      <div
        className={['handSlot', floated ? 'handSlot--lift' : '']
          .filter(Boolean)
          .join(' ')}
      >
        {floated && spacer ? (
          <div
            aria-hidden
            className="dragSpacer"
            style={{ width: spacer.w, height: spacer.h }}
          />
        ) : (
          <div
            className={cardClasses}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) rotate(${dragRotateDeg}deg)`,
            }}
            key={card.cardId}
            onPointerDown={onPointerDown}
          >
            <div className={sheetClass} ref={innerRef}>
              {cardInner}
            </div>
          </div>
        )}
      </div>
      {ghostCard ? createPortal(ghostCard, document.body) : null}
    </>
  )
}
