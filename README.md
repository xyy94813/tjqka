# TJQKA（德州扑克胜率计算器）

<p align="center">
  <img src="public/icon.svg" alt="TJQKA logo" width="180" />
</p>

**TJQKA**（Texas Hold'em JQKA，取自扑克牌中 T、J、Q、K、A 五张高牌连缀）是一款面向德州扑克爱好者的 PWA 胜率计算器。用户输入当前手牌与已翻开的公共牌，应用通过本地计算实时评估该手牌在给定牌桌人数下对随机对手的胜率，并展示牌型概率分布与常见参考牌型的 open 前概率。

> 基于产品文档和 AI 能力构建的演示应用。
> 技术栈选型：React + Vite + TypeScript。

## 运行

1. 安装依赖

```bash
npm install
```

2. 启动开发服务器

```bash
npm run dev
```

3. 构建发布

```bash
npm run build
```

## 功能

- 输入手牌与公共牌
- 实时计算胜率、平局率、失败率
- 简单结果解释
- PWA 支持 manifest 与 service worker

## 目录

- `src/App.tsx`：核心页面与胜率计算逻辑
- `public/manifest.json`：PWA manifest
- `public/sw.js`：离线缓存 service worker
