# 开发过程记录

## 目标

按笔试题要求实现 H5 卡牌单词分类核心循环：抽牌 → 放分类 → 归单词 → 步数 → 胜负；单关手工数据；注重拖拽手感与基础动效。

## 迭代摘要

1. **脚手架**：目录原为 Vite 默认 TS 模板，补充 `@vitejs/plugin-react` 与 `jsx` 配置，改为 React 入口 `main.tsx`。
2. **模型拆分**：`types` / `level` / `gameModel` 分离，UI 只调 `tryDraw`、`tryPlaceOnPillar`，便于单测与改关。
3. **交互**：手牌区 Pointer 拖拽；松手时用柱 DOM 的实时 `getBoundingClientRect()` 做命中（含外扩 padding）。
4. **动效**：亮牌 flip-in、误放 shake、入栈 stack-in、终局 toast；保留 `prefers-reduced-motion`。
5. **构建修复**：移除未使用类型导入；补全 `onDropAtScreen` 参数类型；补充 `src/vite-env.d.ts`。

## 调试笔记

- `tsc` 严格模式下，`HandCard` 的回调参数需显式标注 `clientY: number`。
- `gameModel` 中胜利判定需在扣步后先判断 `isWinning`，避免「最后一步刚好步数为 0」被判负。

## 参考资料

- [Solitaire Associations Journey（Google Play）](https://play.google.com/store/apps/details?id=com.hitappsgames.wordsolitaire)
- [Vite 指南](https://vite.dev/guide/)
- [React 事件 — Pointer 事件](https://react.dev/reference/react-dom/components/common#mouseevent-handler)

## AI 使用说明

本仓库部分代码与文档由 AI 辅助生成，人工审阅后纳入项目；过程类说明以本文件与 `DESIGN.md` 为准。
