# React Frontend Template

一个面向中型业务项目的 React 前端架构模板，重点不是堆 UI，而是提供一套可以直接继续开发业务代码的工程骨架。

## 特性

- React 19 + Vite + TypeScript
- React Router
- TanStack Query
- Axios 请求层封装
- Zustand 客户端状态管理
- i18next 多语言
- next-themes 主题切换
- React Hook Form + Zod
- shadcn/ui 基础组件兼容结构
- 最小可执行 Harness Engineering 文档体系

## 适合场景

适合用作：

- 中后台项目起手模板
- 需要明确分层和目录边界的 React 项目
- 希望引入 AI 协作约束的前端项目
- 需要逐步扩展为中型业务系统的工程底座

不追求：

- 现成的炫酷 UI 成品
- 大而全的企业脚手架
- 把所有工程能力一次性堆满

## 技术栈

- React 19
- Vite 8
- TypeScript 6
- React Router 7
- TanStack Query 5
- Axios
- Zustand
- i18next
- next-themes
- React Hook Form
- Zod
- Tailwind CSS v4
- shadcn/ui

## 快速开始

```bash
npm install
npm run dev
```

## 常用命令

```bash
npm run dev
npm run lint
npm run build
npm run validate
```

## 环境变量

当前模板使用的核心环境变量：

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_DEFAULT_LOCALE=zh-CN
VITE_ENABLE_DEMO_AUTH=true
```

说明：

- `VITE_API_BASE_URL`：接口基础地址
- `VITE_DEFAULT_LOCALE`：默认语言
- `VITE_ENABLE_DEMO_AUTH`：是否启用内置 Demo 登录流程

## 目录结构

```text
src/
├─ main.tsx                # 薄入口
├─ app/                    # 应用装配层
├─ locales/                # 多语言资源
├─ modules/                # 业务模块
├─ pages/                  # 页面层
├─ widgets/                # 应用级组合块
└─ shared/                 # 共享基础设施与通用能力
```

更完整的职责说明见：

- `docs/ARCHITECTURE.md`
- `AGENT.md`
- `docs/ADR/`

## 架构原则

这套模板的核心原则：

1. 入口薄，装配集中
2. 页面薄，业务逻辑收敛到模块
3. 共享层克制，避免变成垃圾桶
4. 类型、状态、i18n、存储都按归属分层放置
5. 架构规则尽量写进仓库，而不是只放在脑子里

## 关键分层

### `app`

应用装配层，负责：

- `App` 入口
- providers
- router
- layouts
- i18n 初始化
- app 级 store
- 全局样式和环境配置

### `modules`

业务模块层，按业务主题组织代码。

例如：

- `auth`
- `user`
- `project`

模块内默认优先保持扁平：

```text
modules/auth/
├─ api.ts
├─ schema.ts
├─ store.ts
├─ types.ts
├─ use-auth.ts
└─ index.ts
```

### `pages`

页面层只做页面级组装：

- 路由参数读取
- 页面布局组织
- 调用模块能力

### `shared`

共享层只放跨业务复用的能力：

- `shared/api`
- `shared/lib`
- `shared/hooks`
- `shared/types`
- `shared/constants`
- `shared/ui`

## 多语言策略

语言资源按模块拆分：

```text
src/locales/
├─ zh-CN/
│  ├─ common.ts
│  ├─ auth.ts
│  ├─ dashboard.ts
│  └─ settings.ts
└─ en-US/
   ├─ common.ts
   ├─ auth.ts
   ├─ dashboard.ts
   └─ settings.ts
```

`src/app/i18n/index.ts` 会自动聚合 `src/locales/<locale>/<module>.ts`，新增语言文件时不需要再手动维护 resources。

## 状态管理策略

- 服务端状态：TanStack Query
- 项目自身客户端状态：Zustand
- 主题：next-themes
- 多语言：i18n
- 浏览器存储：`shared/lib/storage.ts`

## 类型放置规则

- 业务类型：放模块内 `types.ts`
- 通用 API 协议类型：放 `shared/types/api.ts`
- 通用跨模块类型：放 `shared/types`
- 页面临时类型：先就近放页面附近

## API 封装策略

请求层位于 `src/shared/api`，提供：

- axios 实例
- 请求拦截器
- 重复请求取消
- 错误归一化
- upload / download 支持

业务模块通过统一的请求入口调用，不在页面层直接拼请求细节。

## Harness Engineering

仓库内包含最小可执行的 Harness 结构：

- `AGENT.md`：Agent 工作入口规则
- `docs/ARCHITECTURE.md`：架构边界与分层规则
- `docs/ADR/`：架构决策记录
- `harness/memory/`：经验与技术债记录
- `harness/trace/`：阶段性过程与排查记录

## 命名规范

- 目录和普通文件：`kebab-case`
- React 组件文件：`kebab-case`
- React 组件导出名：`PascalCase`
- hooks：`use-xxx.ts`
- 模块目录已表达业务语义时：`api.ts / store.ts / types.ts / schema.ts`
- 避免重复命名，例如：`shared/types/api.ts` 优于 `shared/types/api.types.ts`

## 验证标准

完成改动后统一执行：

```bash
npm run validate
```

当前验证内容：

- `npm run lint`
- `npm run build`

## 后续建议

如果你准备把这个仓库继续扩展成业务项目，推荐按这个顺序推进：

1. 新增 `user`、`project` 等业务模块样板
2. 增加表格页、详情页、表单页的通用页面模式
3. 补充测试基础设施
4. 补充 License、GitHub Actions、Issue / PR 模板
