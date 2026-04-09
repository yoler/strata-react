# Trace 2026-04-08 Storage And State Ownership

## 背景

本轮讨论聚焦两个问题：

1. 是否需要单独封装 `localStorage`
2. `locale`、`theme` 是否应该统一放入 Zustand

## 讨论结论

结论不是“只用 Zustand persist”或“完全不用宿主库”，而是按状态类型区分：

- 服务端状态：TanStack Query
- 项目自身客户端状态：Zustand
- 平台型配置：优先由宿主库管理
- 浏览器持久化：统一走轻量 storage 封装与 key 常量

## 为什么这样做

### 不把 `locale` 强行放进 Zustand

因为真正的语言状态宿主是 `i18n`。如果再额外在 Zustand 里存一份，会出现双状态源。

### 不把 `theme` 强行放进 Zustand

因为真正的主题状态宿主是 `next-themes`。如果再额外在 Zustand 里存一份，同样会出现同步和边界问题。

### 仍然保留 storage 封装

因为除了 Zustand persist 之外，项目仍然有非 store 场景的浏览器持久化需求，例如：

- 语言偏好
- 主题 key 统一命名
- 后续可能新增的轻量偏好项

## 实施动作

1. 新增统一存储 key 常量
2. 强化 `shared/lib/storage.ts`
3. `locale` 改为 `i18n + storage`
4. `theme` 继续使用 `next-themes`
5. 更新架构文档
6. 新增 ADR-0002 记录正式决策
