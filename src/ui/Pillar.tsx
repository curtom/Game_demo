import type { CSSProperties } from 'react'

import type { PillarSlot } from '../game/types'
import { ColumnChainDrag } from './ColumnChainDrag'

type Props = {
  index: number
  pillar: PillarSlot
  registerEl: (index: number, el: HTMLDivElement | null) => void
  categoryLabel: (id: string) => string
  categoryHue: (id: string) => number
  successFlash: boolean
  columnChainPlayable: boolean
  rejectVersion: number
  onColumnChainFinish: (pillarIndex: number, clientX: number, clientY: number) => void
}

export function Pillar({
  index,
  pillar,
  registerEl,
  categoryLabel,
  categoryHue,
  successFlash,
  columnChainPlayable,
  rejectVersion,
  onColumnChainFinish,
}: Props) {
  const hue = pillar.lockedCategoryId
    ? categoryHue(pillar.lockedCategoryId)
    : 260

  const { concealed, pile } = pillar.tableau

  return (
    <div
      className={['pillar', successFlash ? 'pillar--flash' : ''].filter(Boolean).join(' ')}
      ref={(node) => registerEl(index, node)}
      data-pillar-index={index}
      style={
        {
          '--pillarHue': `${hue}`,
        } as CSSProperties
      }
    >
      <div className="pillar__slotShell">
        <div className="pillar__slot" data-hit="slot">
          <span className="pillar__crown" aria-hidden>
            ♔
          </span>
          {pillar.lockedCategoryId ? (
            <div className="pillar__slotBody">
              <span className="pillar__title">
                {categoryLabel(pillar.lockedCategoryId)}
              </span>
              {pillar.quotaTotal > 0 && (
                <span className="pillar__quota">
                  还需 {pillar.quotaRemaining} / 共 {pillar.quotaTotal}
                </span>
              )}
            </div>
          ) : (
            <span className="pillar__placeholder">拖入分类卡</span>
          )}
        </div>
      </div>

      <div className="pillar__tableau" data-hit="tableau">
        <div className="tableauConcealed" aria-hidden>
          {concealed.map((c, i) => (
            <div
              key={c.cardId}
              className="tableauBack"
              style={{ ['--concealI' as string]: `${i}` }}
            />
          ))}
        </div>
        <ColumnChainDrag
          pillarIndex={index}
          pile={pile}
          playable={columnChainPlayable}
          rejectVersion={rejectVersion}
          onDragFinish={onColumnChainFinish}
        />
      </div>
    </div>
  )
}
