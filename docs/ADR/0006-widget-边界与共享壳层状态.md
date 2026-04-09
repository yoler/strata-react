# ADR-0006 Widget 边界与共享壳层状态

## 状态

已采纳

## 背景

模板最初将 sidebar 折叠状态放在 `app/store` 中，而 `widgets/app-header` 与 `widgets/app-sidebar` 直接读取这个 store。

这会带来一个边界问题：

- 文档规定 `widgets` 只能依赖 `modules` 和 `shared`
- 但实际代码存在 `widgets -> app/store`

这虽然不是功能性 bug，但会让 `widgets` 从“应用级组合块”退化成“隐式依赖应用装配层实现细节”的层级。

## 决策

本项目将跨页面壳层 UI 状态下沉到 `shared/store`：

- `shared/store/ui-store.ts`

并同步执行两条规则：

1. `widgets` 禁止直接导入 `app`
2. 这条规则通过 ESLint `no-restricted-imports` 自动校验

## 为什么这么做

### 为什么不继续放在 `app/store`

因为 sidebar 折叠状态虽然属于应用壳层，但它并不是应用装配流程的一部分，而是一种可复用的客户端 UI 状态。它需要被 `widgets` 消费，因此更适合下沉到共享层。

### 为什么放 `shared/store`

因为这类状态同时满足：

- 不属于单一业务模块
- 会被多个壳层组件复用
- 不应该让 `widgets` 反向依赖 `app`

因此比起保留在 `app/store`，放到 `shared/store` 更符合当前模板的单向依赖原则。

## 后果

正向影响：

- `widgets` 的依赖方向重新与文档保持一致
- 应用壳层状态的位置更清晰
- 分层守卫更完整

代价：

- `shared` 目录增加一个新的 `store` 子层
- 需要额外维护“什么状态算共享壳层状态”的边界判断
