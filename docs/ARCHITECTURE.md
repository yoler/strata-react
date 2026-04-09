# ARCHITECTURE.md

## 1. 文档目的

本文件描述本仓库最小可执行的架构约定，用于约束人类工程师和 AI Agent 的共同实现方式。

重点回答四个问题：

1. 代码放哪里
2. 代码之间怎么依赖
3. 什么算架构变更
4. 变更后要更新什么

默认原则：

- 架构一致性优先于生态默认目录习惯
- 命名规范优先表达文件语义，再考虑社区默认命名

---

## 2. 目录职责

### `src/main.tsx`

应用入口。

只负责：

- 挂载 `src/app/app.tsx`

不负责：

- 直接编写装配逻辑
- 直接挂载 providers
- 直接初始化 i18n

### `src/app`

应用装配层。

适合放：

- `app.tsx`
- providers
- router
- layouts
- app 级 store
- i18n 初始化
- 环境配置
- 全局样式

不适合放：

- 具体业务逻辑
- 某个业务模块的接口与组件

### `src/locales`

语言资源层。

适合放：

- `src/locales/zh-CN/common.ts`
- `src/locales/zh-CN/dashboard.ts`
- `src/locales/en-US/common.ts`
- `src/locales/en-US/dashboard.ts`

原则：

- 只放翻译资源内容
- 不放 i18n 初始化逻辑
- 按 `src/locales/<locale>/<module>.ts` 组织
- 由 `src/app/i18n/index.ts` 自动聚合，不手动维护 resources 列表

### `src/modules`

业务模块层。

适合放：

- 某个业务域的 API
- hooks
- store
- schema
- types
- components

原则：

- 按业务域拆分
- 模块内尽量自治
- 业务逻辑优先收敛到模块内
- 多个页面可以共享同一个模块
- 业务可复用 UI 优先放在模块内

### `src/pages`

页面层。

适合放：

- 路由页面组件
- 页面级布局组装
- 路由参数读取

原则：

- 页面要薄
- 页面只组装，不承载重业务逻辑
- 页面专属 UI 可以放在页面目录内
- 复杂页面允许在页面目录下继续拆 `components/` 和页面局部 hook

### `src/widgets`

应用级组合块。

适合放：

- Header
- Sidebar
- UserMenu
- ThemeToggle
- LanguageSwitcher

原则：

- 跨页面复用
- 带应用壳子语义
- 不是基础通用 UI

### `src/shared`

共享层。

适合放：

- `api`
- `lib`
- `hooks`
- `types`
- `constants`
- `ui`

其中：

- `shared/ui` 只放全局通用 UI 组件
- 不放业务组件
- `shared/constants/storage-keys.ts` 统一定义浏览器存储 key
- `shared/lib/storage.ts` 提供轻量浏览器存储封装
- `shared/api` 负责 axios 实例、请求客户端、错误归一化、请求取消和上传下载支持
- `shared/types` 只放跨模块复用的通用类型和基础协议类型

### `harness/memory`

经验层。

适合放：

- 技术债观察
- 踩坑记录
- 历史包袱说明
- 尚未上升为正式规则的经验总结

原则：

- 不代替 ADR
- 不写正式架构规则

### `harness/trace`

过程层。

适合放：

- 排查记录
- 迁移过程记录
- 阶段性执行结论

原则：

- 偏过程，不偏长期规则
- 可在阶段结束后归档或提炼

---

## 3. 依赖方向

允许：

- `main` -> `app`
- `app` -> `modules` / `pages` / `widgets` / `shared` / `locales`
- `pages` -> `modules` / `widgets` / `shared`
- `widgets` -> `modules` / `shared`
- `modules` -> `shared`
- `shared` -> `shared`

禁止：

- `shared` -> `modules`
- `shared` -> `pages`
- `shared` -> `widgets`
- `shared` -> `app`
- `modules` -> `pages`
- `modules` -> `widgets`
- `modules` -> `app`

---

## 4. 命名规范

1. 目录名统一使用 `kebab-case`
2. 普通文件统一使用 `kebab-case`
3. React 组件文件统一使用 `kebab-case`，组件导出名使用 `PascalCase`
4. hooks 文件使用 `use-xxx.ts`
5. 模块目录已表达业务主题时，模块内职责文件优先使用 `api.ts`、`store.ts`、`types.ts`、`schema.ts`
6. 只有在目录语义不足或模块继续细分时，再使用 `xxx.store.ts`、`xxx.types.ts`、`xxx.schema.ts`
7. `index.ts(x)` 只用于目录入口或聚合导出
8. locale 目录遵循标准语言代码，例如 `zh-CN`、`en-US`
9. 文件目录已表达语义时，命名避免重复前缀或重复后缀，例如 `shared/types/api.ts` 优于 `shared/types/api.types.ts`
10. 类型名本身要表达清晰业务语义，避免过宽泛命名，例如模块内优先使用 `AuthUser`、`LoginResponse`，而不是 `User`、`LoginResult`

---

## 5. UI 放置规则

按归属放置 UI，而不是按“是不是组件”放置。

1. 页面专属 UI 放 `pages/.../components`
2. 业务可复用 UI 放 `modules/.../components`
3. 全局通用基础 UI 放 `shared/ui`
4. 跨页面应用级组合块放 `widgets`

弹框和抽屉同样遵循这条规则：

1. 只服务当前页面的弹框和抽屉，放页面目录内
2. 带业务语义、可能被多个页面复用的弹框和抽屉，放模块目录内
3. 基础 `Dialog` / `Drawer` 能力放 `shared/ui`

复杂页面推荐结构：

```text
pages/order-detail/
├─ index.tsx
├─ components/
│  ├─ detail-header.tsx
│  ├─ action-bar.tsx
│  └─ page-skeleton.tsx
└─ use-order-detail-page.ts
```

其中：

- 页面布局块、页面 section、页面局部状态 hook 放页面目录内
- 业务卡片、业务表格、业务弹框、业务抽屉放模块目录内

---

## 6. 模块组织规则

一个 module 表示一个业务主题，而不是一个技术类型目录。

例如：

- `auth`
- `user`
- `project`
- `order`

不适合作为 module 的是：

- `api`
- `hooks`
- `utils`
- `components`

模块默认先保持扁平：

```text
modules/auth/
├─ api.ts
├─ schema.ts
├─ store.ts
├─ types.ts
├─ use-auth.ts
└─ index.ts
```

当模块中同类文件超过 2 到 3 个，或出现明显子域时，再升级成子目录结构：

```text
modules/auth/
├─ api/
├─ hooks/
├─ components/
├─ model/
└─ index.ts
```

---

## 7. 类型放置规则

类型放哪里，不看“它是不是类型”，而看“它属于哪一层”。

1. 业务相关类型放 `modules/<module>/types.ts`
2. 通用跨模块类型放 `shared/types`
3. 通用 API 协议类型放 `shared/types/api.ts`
4. 页面专属临时类型先放页面附近，不要过早提升

### 业务类型

适合放在模块内：

- `LoginPayload`
- `LoginResponse`
- `User`
- `Project`
- `OrderStatus`

示例：

```text
src/modules/auth/types.ts
src/modules/user/types.ts
src/modules/project/types.ts
```

### 共享类型

适合放在 `shared/types`：

- `Nullable<T>`
- `OptionItem`
- `PaginationParams`
- `PaginatedResponse<T>`
- `ApiResponse<T>`

推荐结构：

```text
src/shared/types/
├─ common.ts
├─ api.ts
└─ index.ts
```

规则：

- 业务 DTO 不进入 `shared/types`
- 通用协议壳可以进入 `shared/types/api.ts`
- 页面临时 view model 不要一开始就放到共享层
- 目录已经表达语义时，文件名保持最小职责命名，例如 `shared/types/api.ts`
- 类型名避免重复和含糊，例如 `AuthUser` 优于模块内直接使用 `User`

---

## 8. 状态归属规则

1. 服务端状态优先由 TanStack Query 管理
2. 项目自身客户端状态优先由 Zustand 管理
3. 平台型配置优先由宿主库管理，Zustand 只负责项目自身客户端状态
4. 主题配置优先交给 `next-themes`
5. 多语言配置优先交给 `i18n`
6. 浏览器存储通过 `shared/lib/storage.ts` 和 `shared/constants/storage-keys.ts` 统一管理
7. 只有当某个配置不存在明确宿主，且确实属于项目自身客户端状态时，才考虑放入 Zustand

---

## 9. 设计原则

1. 入口薄，装配集中
2. 页面薄，业务收敛到模块
3. 共享层克制，避免变成垃圾桶
4. 真正业务无关的组件才能进入 `shared/ui`
5. 架构变更必须留痕

---

## 10. 需要写 ADR 的情况

出现以下任一情况时，新增或更新 ADR：

- 调整目录分层
- 更换或新增状态管理方案
- 更换或新增请求方案
- 调整路由组织方式
- 调整 i18n 目录策略
- 引入会影响全局开发方式的新依赖

---

## 11. 当前模板的关键决策

1. `src/main.tsx` 保留为薄入口，只负责挂载 `src/app/app.tsx`
2. i18n 初始化放在 `src/app/i18n`，语言资源放在 `src/locales`
3. 多语言资源按 `src/locales/<locale>/<module>.ts` 组织，并由 `i18n` 自动聚合
4. 全局通用 UI 组件统一放在 `src/shared/ui`
5. 业务组件统一放在 `src/modules/*/components`
6. 平台型配置优先由宿主库管理，`locale` 由 `i18n + storage` 管理，`theme` 由 `next-themes` 管理
7. API 请求统一通过 `shared/api/request.ts` 暴露，请求拦截、重复请求取消、错误归一化与上传下载能力放在基础设施层处理
8. 模块目录默认先保持扁平；在 `modules/auth` 这类明确业务目录中，优先使用 `api.ts / store.ts / types.ts / schema.ts / use-xxx.ts`
9. 类型遵循分层放置：业务类型跟业务走，通用类型进 `shared/types`，页面临时类型就近放
