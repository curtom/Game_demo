# 卡牌单词分类 — 核心玩法 Demo

单人本关 Demo：开局有**发牌飞入各柱**的引导动画；随后从牌堆抽牌，把**分类卡**摆到空柱，再把**单词卡**拖入对应主题。**匹配错误**时会震动 + 低沉提示音，并弹出规则说明框（约 4.5 秒收起）；**匹配成功**有高亮音效与柱子/单词的动态反馈；**通关**有庆祝弹窗与短旋律。**四根柱**，牌量多于初版。

## 运行

```bash
npm install
npm run dev
```

浏览器打开终端里提示的本地地址（通常为 `http://localhost:5173`）。

## 构建与预览

```bash
npm run build
npm run preview
```

## 项目结构（简要）

| 路径 | 说明 |
|------|------|
| `src/game/types.ts` | 牌、柱、阶段等数据类型 |
| `src/game/level.ts` | 单关牌序与分类配置 |
| `src/game/gameModel.ts` | 抽牌 / 落子 / 胜负纯逻辑 |
| `src/audio/gameSounds.ts` | Web Audio 提示音（发牌/成功/失败/通关） |
| `src/fx/haptics.ts` | 误配振动（`navigator.vibrate`） |
| `DESIGN.md` | 设计文档（技术选型、玩法、手感与动效） |
| `process/` | 开发过程记录 |

## 操作说明

1. 点击下方牌堆**翻开**下一张到手牌区（手牌区空时才能抽）。
2. **拖动手牌**到某一柱上方松开：分类卡只可落在**尚无分类**的柱；单词卡只可落在**已放好对应分类**的柱。
3. 误放会**震动 + 音效**，并弹出**规则提示**（自动消失）；成功落子有**音效**与柱子高亮。**通关**时出现全屏祝贺与礼花粒子。
4. 每一步成功落子**扣 1 步**。本关 **4** 根柱、共 **24** 张需打出（分类 4 + 单词 20），默认 **26 步**（见 `src/game/level.ts`）。

参考原作：[Solitaire Associations Journey](https://play.google.com/store/apps/details?id=com.hitappsgames.wordsolitaire)（本题不要求关卡生成与难度曲线）。
