import { useEffect, useRef } from 'react'

type RulesPopupProps = {
  open: boolean
  onClose: () => void
}

export function RulesPopup({ open, onClose }: RulesPopupProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocPointerDown = (e: PointerEvent) => {
      const el = e.target as Node | null
      if (!el || cardRef.current?.contains(el)) return
      onClose()
    }
    window.addEventListener('pointerdown', onDocPointerDown, true)
    return () => window.removeEventListener('pointerdown', onDocPointerDown, true)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const fallback = window.setTimeout(onClose, 30000)
    return () => window.clearTimeout(fallback)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="rulesPop" aria-live="polite">
      <div
        ref={cardRef}
        className="rulesPop__card"
        role="dialog"
        aria-modal="false"
        aria-label="游戏规则提示"
      >
        <h2 className="rulesPop__title">规则速查</h2>
        <ul className="rulesPop__list">
          <li>
            <strong>分类卡</strong>只能放到<strong>空槽</strong>（无主题时）。卡上数字表示该主题需成功匹配几次才<strong>结算清空</strong>。
          </li>
          <li>
            <strong>单词手牌</strong>可拖到<strong>卡槽</strong>（已放分类且主题一致），或拖到<strong>槽下明牌串</strong>与最底明牌<strong>同主题</strong>时贴合增长。
          </li>
          <li>
            拖动动过的<strong>整串明牌</strong>到<strong>任一列的卡槽</strong>
            （该槽已放分类且单词主题一致，进度不少于串长）。
          </li>
          <li>成功操作扣 1 步；放错不扣步，会有震动与提示。点弹窗外可关闭。</li>
        </ul>
      </div>
    </div>
  )
}
