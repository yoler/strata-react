# AGENT.md

## 1. 目的

本文件定义本仓库内人类工程师与 AI Agent 共同遵守的最小工作约束。

目标只有四个：

1. 让改动位置清晰
2. 让边界约束清晰
3. 让验证方式清晰
4. 让架构决策有记录

本仓库默认以“架构一致性优先”作为组织原则，再考虑生态默认习惯。
如果本文件与用户明确指令冲突，以用户指令为准。

---

## 2. 开始工作前必须做什么

1. 先阅读本文件
2. 如果任务涉及目录结构、路由、状态管理、接口组织、构建配置，继续阅读 `docs/ARCHITECTURE.md`
3. 如果任务引入新的架构决策，新增或更新 `docs/ADR/` 下的 ADR 文件

---

## 3. 最小硬约束

1. 只做与当前任务相关的最小改动
2. 不要顺手重构无关代码
3. 不要跳过 lint、类型检查、构建验证
4. 不要把复杂业务逻辑堆在页面组件里
5. 不要破坏既有目录边界
6. 不要在没有说明的情况下新增依赖
7. 不要修改全局配置而不记录原因

---

## 4. 命名规范

1. 目录名统一使用 `kebab-case`
2. 普通文件统一使用 `kebab-case`
3. React 组件文件也统一使用 `kebab-case`
4. React 组件导出名使用 `PascalCase`
5. hooks 文件使用 `use-xxx.ts`
6. 模块目录已表达业务主题时，模块内职责文件优先使用 `api.ts`、`store.ts`、`types.ts`、`schema.ts`
7. 只有在目录语义不足或模块继续细分时，再使用 `xxx.store.ts`、`xxx.types.ts`、`xxx.schema.ts`
8. locale 目录遵循标准语言代码，例如 `zh-CN`、`en-US`
9. `index.ts(x)` 只用于目录入口或聚合导出
10. 文件目录已表达语义时，命名避免重复前缀或重复后缀
11. 类型名本身要有清晰业务语义，避免过宽泛命名

---

## 5. 目录职责

- `src/main.tsx`
  - 薄入口，只负责挂载 `src/app/app.tsx`
- `src/app`
  - 应用装配层：app、providers、router、layouts、app 级 store、i18n 初始化、全局样式、环境配置
- `src/locales`
  - 多语言资源文件
- `src/modules`
  - 按业务域组织的模块代码
- `src/pages`
  - 路由页面组件，只做页面级组装
- `src/widgets`
  - 跨页面复用、但带应用语义的组合块
- `src/shared`
  - 跨业务共享能力：api、lib、hooks、types、constants、ui
- `harness/memory`
  - 经验、技术债、踩坑记录，不代替 ADR
- `harness/trace`
  - 阶段性执行记录、排查结论、迁移记录

---

## 6. 分层规则

允许依赖方向：

- `main` -> `app`
- `app` -> `modules` / `pages` / `widgets` / `shared` / `locales`
- `pages` -> `modules` / `widgets` / `shared`
- `widgets` -> `modules` / `shared`
- `modules` -> `shared`
- `shared` -> `shared`

禁止：

1. `shared` 依赖 `modules`、`pages`、`widgets`、`app`
2. `modules` 依赖 `pages`、`widgets`、`app`
3. `pages` 直接编写可复用的业务逻辑
4. 把业务组件放进 `shared/ui`

---

## 7. UI 组件规则

1. `src/shared/ui` 只放全局通用 UI 组件
2. 业务组件放进 `src/modules/*/components`
3. 应用壳子类组合块放进 `src/widgets`

---

## 8. 文档更新规则

出现以下情况时，必须同步更新文档：

- 新增或调整目录职责：更新 `docs/ARCHITECTURE.md`
- 新增架构决策：新增 `docs/ADR/*.md`
- 新增重要依赖：更新 `docs/ARCHITECTURE.md`
- 更改数据流、路由组织、状态管理方式：更新 `docs/ARCHITECTURE.md` 和 ADR
- 需要沉淀经验、技术债、踩坑信息：更新 `harness/memory/`
- 需要保留阶段性排查或迁移过程：更新 `harness/trace/`

---

## 9. 验证命令

完成改动后，统一执行：

```bash
npm run validate
```

当前验证内容：

```bash
npm run lint
npm run build
```

---

## 10. 提交标准

只有在以下条件满足时，改动才算完成：

1. 代码改动满足当前任务
2. 验证命令通过
3. 必要文档已更新
4. 没有引入明显越层依赖
