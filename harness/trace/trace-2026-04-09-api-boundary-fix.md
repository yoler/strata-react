# 2026-04-09 API 分层修复记录

## 背景

在架构评审中，发现 `shared/api` 直接依赖了：

- `modules/auth/store`
- `app/i18n`

这违反了模板当前定义的单向依赖规则。

## 本次调整

1. 将 token 注入、语言头注入、401 登出处理从 `shared/api` 提升到 `app/api/setup.ts`
2. 保留 `shared/api` 作为纯基础设施层
3. 为 dashboard 和 sidebar 补齐剩余 i18n 文案
4. 在 ESLint 中加入最小可执行的分层守卫

## 说明

- 本次守卫优先覆盖最关键的 `shared`、`modules`、`pages` 边界
- `widgets` 与 `app/store` 目前仍有一处现实耦合，后续可继续收紧
- 这次先修“真实违规”和“核心守卫”，避免一次性过度重构
