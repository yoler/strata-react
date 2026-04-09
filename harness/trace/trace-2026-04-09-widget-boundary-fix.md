# 2026-04-09 Widget 边界修复记录

## 背景

在继续收紧分层规则时，发现：

- `widgets/app-header`
- `widgets/app-sidebar`

都直接依赖 `app/store`。

这与当前文档中“`widgets` 只能依赖 `modules` 和 `shared`”的规则不一致。

## 本次调整

1. 将 `useUiStore` 从 `app/store` 下沉到 `shared/store`
2. 删除旧的 `app/store`
3. 在 ESLint 中增加 `widgets` 禁止导入 `app` / `pages` 的规则

## 说明

- 这次下沉的是“跨页面壳层 UI 状态”
- 不是所有状态都应该进入 `shared/store`
- 业务状态仍然优先留在 `modules`，平台配置仍然优先交给宿主库
