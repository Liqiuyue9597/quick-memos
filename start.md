# obsidian-memos 代码审查指南

## 项目概览

一个 flomo 风格的 Obsidian 插件，提供快速捕获想法和卡片视图浏览功能。

- **入口文件**: `main.ts`（单文件，653 行，包含全部逻辑）
- **构建工具**: esbuild (`esbuild.config.mjs`)
- **样式**: `styles.css`（342 行）
- **最低 Obsidian 版本**: 1.4.0

---

## 文件清单

| 文件 | 用途 | 行数 | 优先级 |
|------|------|------|--------|
| `main.ts` | 插件核心逻辑（全部代码） | 653 | ★★★ |
| `styles.css` | UI 样式 | 342 | ★★ |
| `esbuild.config.mjs` | 构建配置 | 45 | ★ |
| `manifest.json` | 插件元数据 | 10 | ★ |
| `package.json` | 依赖与脚本 | 20 | ★ |
| `tsconfig.json` | TypeScript 配置 | 14 | ★ |
| `versions.json` | 版本兼容映射 | 1 | ★ |

---

## main.ts 结构总览

```
L1-16     Imports & Constants
L18       VIEW_TYPE_MEMOS 常量
L20-42    共享工具函数 (INLINE_TAG_RE, extractInlineTags, escapeHtmlAttr)
L44-66    接口与默认值 (MemoNote, MemosSettings, DEFAULT_SETTINGS)
L68-180   MemosPlugin 类（插件主体）
L182-486  MemosView 类（侧边栏卡片视图）
L488-592  CaptureModal 类（快速捕获弹窗）
L594-652  MemosSettingTab 类（设置面板）
```

---

## 已修复的问题

| # | 严重度 | 问题 | 修复方式 |
|---|--------|------|----------|
| 1 | 🔴 高 | tag 值未转义直接插入 HTML 属性（XSS 风险） | 新增 `escapeHtmlAttr()` 函数，`data-tag` 属性值经过完整转义；HTML escape 补充了 `"` 和 `'` 处理 |
| 2 | 🔴 高 | 文件夹路径匹配 bug，`startsWith(folder)` 误匹配同名前缀文件夹 | 改为严格匹配 `folder + "/"` |
| 3 | 🟡 中 | vault 事件无 debounce，频繁操作时性能问题 | 添加 300ms debounce 机制，`onClose` 时清理 timer |
| 4 | 🟡 中 | ISO/本地时间混用 + 秒级文件名可能冲突 | 统一使用本地时间生成日期和时间，文件名添加毫秒后缀 |
| 5 | 🟡 中 | inline tag 提取逻辑在 `parseMemo` 和 `handleSave` 中重复 | 提取为共享函数 `extractInlineTags()` 和常量 `INLINE_TAG_RE` |
| 6 | 🟢 低 | tag 正则不支持日韩 CJK 字符 | 扩展正则范围覆盖日文假名 (`\u3040-\u309f`, `\u30a0-\u30ff`) 和韩文 (`\uac00-\ud7af`) |
| 7 | 🟢 低 | 快捷键提示硬编码 "Ctrl+Enter"，macOS 上不准确 | 检测 `navigator.platform`，macOS 显示 "⌘+Enter" |
| 8 | 🟢 低 | fixedTag 只清一个 `#`，`##tag` 会残留 | 所有 `replace(/^#/, "")` 改为 `replace(/^#+/, "")` |
| 9 | 🟢 低 | `handleSave` 缺少错误处理，保存失败用户无感知 | 添加 try/catch，失败时 Notice 提示错误信息 |
| 10 | 🟢 低 | `parseTags` 不支持中文逗号分隔 | 分隔符正则加入 `，` |
| 11 | 🟡 中 | tsconfig `moduleResolution: "bundler"` 需要 TS 5.0+，与 `typescript ^4.7.4` 不兼容 | 改为 `"node"`，同时移除 TS 5.0+ 的 `allowImportingTsExtensions` |
| 12 | 🟢 低 | CSS `color-mix()` 在旧版 Electron 中可能不支持 | 为 `.memos-tag-pill` 和 `@keyframes memos-pulse` 添加 fallback 值 |

---

## 逐段审查清单

### 1. Imports & Constants (L1-42)

- [x] **L5-16** — 从 `obsidian` 导入的 API 都有实际使用 ✓
- [x] **L18** — `VIEW_TYPE_MEMOS` 命名符合 Obsidian 插件规范 ✓
- [x] **L20-21** — `INLINE_TAG_RE` 共享正则，覆盖中日韩 CJK 字符 ✓（已修复 #5, #6）
- [x] **L23-32** — `extractInlineTags()` 共享函数消除重复代码 ✓（已修复 #5）
- [x] **L34-42** — `escapeHtmlAttr()` 安全转义 HTML 属性值 ✓（已修复 #1）
- [x] **L48-54** — `MemoNote` 接口字段完整，`created` 用 string 存储 ISO 格式合理 ✓
- [x] **L56-60** — `MemosSettings` 配置项满足当前需求 ✓
- [x] **L62-66** — 默认值合理 ✓

### 2. MemosPlugin (L68-180)

- [x] **L73** — `settings!:` 使用非空断言，`onload` 保证先于其他方法调用 ✓
- [x] **L75-105** — `onload()` 注册顺序合理 ✓
- [x] **L107-109** — `onunload()` 只做 detach，Obsidian 会自动清理其余资源 ✓
- [x] **L111-122** — `activateView()` null 检查完备 ✓
- [x] **L124-171** — `saveMemo()`
  - [x] **L127-132** — 统一使用本地时间，文件名含毫秒后缀避免冲突 ✓（已修复 #4）
  - [x] **L137** — fixedTag 使用 `replace(/^#+/, "")` 清理多个 `#` ✓（已修复 #8）
  - [ ] **L157-158** — 文件夹不存在时创建，但只创建一级目录，嵌套路径如 `a/b/c` 可能需要递归创建

### 3. MemosView (L182-486)

- [x] **L209-218** — debounce 机制避免频繁刷新 ✓（已修复 #3）
- [x] **L236-241** — `onClose()` 清理 timer ✓（已修复 #3）
- [x] **L259** — 文件夹路径严格匹配 `folder + "/"` ✓（已修复 #2）
- [x] **L288** — 使用共享 `extractInlineTags()` ✓（已修复 #5）
- [x] **L427-444** — `renderContentWithTags()`
  - [x] HTML escape 覆盖 `& < > " '` 五种字符 ✓（已修复 #1）
  - [x] `data-tag` 属性使用 `escapeHtmlAttr()` 安全转义 ✓（已修复 #1）
- [ ] **L243-253** — `refresh()` 每次清空并重建整个 DOM，大量 memo 时可考虑增量更新（非必要优化）
- [ ] **L268** — 每个文件都调用 `vault.read()`，大量文件时可考虑缓存（非必要优化）

### 4. CaptureModal (L488-592)

- [x] **L531-534** — 快捷键提示适配 macOS ✓（已修复 #7）
- [x] **L569** — 使用共享 `extractInlineTags()` ✓（已修复 #5）
- [x] **L573-579** — `handleSave` 包含 try/catch 错误处理 ✓（已修复 #9）
- [x] **L584** — `parseTags` 支持中文逗号 `，` ✓（已修复 #10）
- [x] **L585** — tag 清理使用 `replace(/^#+/, "")` ✓（已修复 #8）

### 5. MemosSettingTab (L594-652)

- [x] **L646** — fixedTag 清理使用 `replace(/^#+/, "")` ✓（已修复 #8）
- [ ] **L619** — Save folder 空值回退到 `"00-Inbox"`，但不校验路径合法性（低风险）

---

## styles.css 审查要点

- [x] **L204-207** — `.memos-tag-pill` 添加了 `color-mix()` fallback ✓（已修复 #12）
- [x] **L228-230** — `@keyframes memos-pulse` 添加了 fallback ✓（已修复 #12）
- [ ] **L269-270** — textarea `min-height: 120px` 在极小屏设备上可能偏大（低风险）

---

## 构建 & 配置审查

### tsconfig.json
- [x] `moduleResolution: "node"` 兼容 TS 4.7 ✓（已修复 #11）
- [x] 移除了 TS 5.0+ 的 `allowImportingTsExtensions` ✓（已修复 #11）

### package.json
- [ ] `obsidian: "latest"` 不锁定版本，可能导致构建不稳定（低风险）
- [ ] `typescript: "^4.7.4"` 实际安装为 4.9.x，功能正常

### esbuild.config.mjs
- [x] `target: "es2018"` 与 tsconfig 一致 ✓
- [x] 开发模式 inline sourcemap，生产关闭 ✓

---

## 剩余可优化项（非阻塞）

| # | 类型 | 位置 | 说明 |
|---|------|------|------|
| 1 | 性能 | `refresh()` | 每次全量重建 DOM，大量 memo 时可考虑增量更新 |
| 2 | 性能 | `loadMemos()` | 每个文件调用 `vault.read()`，可考虑缓存 |
| 3 | 健壮性 | `saveMemo()` L157 | 嵌套文件夹路径（如 `a/b/c`）只创建一级目录 |
| 4 | 稳定性 | `package.json` | `obsidian: "latest"` 建议锁定到具体版本 |

---

## 审查进度追踪

- [x] 1. Imports & Constants
- [x] 2. MemosPlugin
- [x] 3. MemosView
- [x] 4. CaptureModal
- [x] 5. MemosSettingTab
- [x] 6. styles.css
- [x] 7. 构建 & 配置文件
- [x] 8. 问题修复与验证 — `npm run build` 通过 ✓
