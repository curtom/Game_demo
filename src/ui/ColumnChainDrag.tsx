import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'

import type { WordCardModel } from '../game/types'

type Props = {
  pillarIndex: number
  pile: WordCardModel[]
  playable: boolean
  rejectVersion: number
  onDragFinish: (pillarIndex: number, clientX: number, clientY: number) => void
}

/** Drags the visible face-up chain as one unit to the slot zone. */
export function ColumnChainDrag({
  pillarIndex,
  pile,
  playable,
  rejectVersion,
  onDragFinish,
}: Props) {
  const draggingRef = useRef(false)
  const grabRef = useRef({ gx: 0, gy: 0 })
  /** Window-level drag uses pointer id; capture target went away once we portal. */
  const activePointerIdRef = useRef<number | null>(null)
  const windowDragCleanupRef = useRef<(() => void) | null>(null)
  const [lift, setLift] = useState(false)
  const innerRef = useRef<HTMLDivElement>(null)
  const [floatPt, setFloatPt] = useState<{ left: number; top: number } | null>(
    null,
  )
  const [spacer, setSpacer] = useState<{ w: number; h: number } | null>(null)

  const detachWindowListeners = useCallback(() => {
    windowDragCleanupRef.current?.()
    windowDragCleanupRef.current = null
    activePointerIdRef.current = null
  }, [])

  useEffect(() => {
    return () => detachWindowListeners()
  }, [detachWindowListeners])

  useEffect(() => {
    if (pile.length === 0) {
      draggingRef.current = false
      detachWindowListeners()
      setLift(false)
      setFloatPt(null)
      setSpacer(null)
    }
  }, [pile.length, detachWindowListeners])

  useEffect(() => {
    const el = innerRef.current
    if (!el || rejectVersion === 0) return
    el.classList.remove('tableauChain__inner--shake')
    void el.getBoundingClientRect()
    el.classList.add('tableauChain__inner--shake')
    const t = window.setTimeout(() => {
      el.classList.remove('tableauChain__inner--shake')
    }, 420)
    return () => window.clearTimeout(t)
  }, [rejectVersion])

  const finishFromWindow = useCallback(
    (e: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>) => {
      const pid = activePointerIdRef.current
      if (pid !== null && e.pointerId !== pid) return false
      detachWindowListeners()
      const was = draggingRef.current
      draggingRef.current = false
      setLift(false)
      setFloatPt(null)
      setSpacer(null)
      if (was && pile.length > 0) {
        onDragFinish(pillarIndex, e.clientX, e.clientY)
      }
      return true
    },
    [detachWindowListeners, onDragFinish, pillarIndex, pile.length],
  )

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!playable || pile.length === 0 || e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      draggingRef.current = true
      setLift(true)
      const pid = e.pointerId
      activePointerIdRef.current = pid
      const rect = e.currentTarget.getBoundingClientRect()
      grabRef.current = {
        gx: e.clientX - rect.left,
        gy: e.clientY - rect.top,
      }
      setFloatPt({ left: rect.left, top: rect.top })
      setSpacer({ w: rect.width, h: rect.height })

      detachWindowListeners()
      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pid) return
        if (!draggingRef.current) return
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
    [detachWindowListeners, finishFromWindow, playable, pile.length],
  )

  if (pile.length === 0) return null

  const topFirst = [...pile].reverse()

  const floated = Boolean(lift && spacer && floatPt)

  /** Pillar `:hover { transform }` breaks viewport-fixed inside tree — ghost goes to body. */
  const chainGhostStyle: CSSProperties = floated
    ? {
        position: 'fixed',
        left: floatPt!.left,
        top: floatPt!.top,
        width: spacer!.w,
        zIndex: 'var(--drag-layer-z)',
        pointerEvents: 'none',
      }
    : {}

  const chainGhostClasses = ['tableauChain', lift ? 'tableauChain--lift' : '']
    .filter(Boolean)
    .join(' ')

  /** Visual clone in portal — no handlers; dragging is driven by window listeners. */
  const chainGhostEl = floated ? (
    <div className={chainGhostClasses} style={chainGhostStyle}>
      <div className="tableauChain__inner">
        <span className="tableauChain__hint" />
        {topFirst.map((w, ei) => (
          <div
            key={w.cardId}
            className="tableauFace"
            style={{ ['--elev' as string]: `${ei}` }}
          >
            <span className="tableauFace__strip" aria-hidden />
            <span className="tableauFace__txt">{w.text}</span>
          </div>
        ))}
      </div>
    </div>
  ) : null

  const interactiveStyle: CSSProperties = floated
    ? { visibility: 'hidden' }
    : {}

  return (
    <>
      <div
        className={['tableauChainHost', floated ? 'tableauChainHost--lift' : '']
          .filter(Boolean)
          .join(' ')}
      >
        <div
          className={chainGhostClasses}
          style={interactiveStyle}
          onPointerDown={onPointerDown}
        >
          <div
            className="tableauChain__inner"
            ref={innerRef}
            data-reject-chain={rejectVersion}
          >
            <span className="tableauChain__hint">
              {floated ? '' : `${pile.length} 张`}
            </span>
            {topFirst.map((w, ei) => (
              <div
                key={w.cardId}
                className="tableauFace"
                style={{ ['--elev' as string]: `${ei}` }}
              >
                <span className="tableauFace__strip" aria-hidden />
                <span className="tableauFace__txt">{w.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {chainGhostEl ? createPortal(chainGhostEl, document.body) : null}
    </>
  )
}
