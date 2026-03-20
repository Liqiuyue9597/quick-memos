# Quick Memos (obsidian-memos) 项目概览

## 简介

**Quick Memos** 是一款仿 [flomo](https://flomoapp.com/) 风格的 Obsidian 插件，专为轻量级笔记捕捉场景设计。它让用户能够无摩擦地记录灵感闪念，并通过卡片式瀑布流界面进行组织、过滤与回顾。所有数据以标准 Markdown 文件存储在 vault 中，完全兼容 Obsidian 生态（Dataview、Graph View、搜索等）。

| 属性 | 值 |
|------|------|
| **插件 ID** | `quick-memos` |
| **仓库地址** | https://github.com/Liqiuyue9597/obsidian-memos |
| **当前版本** | 1.0.0 |
| **许可证** | MIT |
| **最低 Obsidian 版本** | 1.4.0 |
| **作者** | Liqiuyue9597 |
| **平台** | 桌面 + 移动端（`isDesktopOnly: false`） |

## 项目愿景

> 让 Obsidian 用户能够像使用 flomo 一样，快速、无摩擦地捕捉灵感与想法，并通过卡片式界面配合标签过滤、热力图统计和随机回顾功能，实现间隔重复式学习与知识管理。

**核心设计原则：**
1. **零摩擦捕捉** — 一键打开、快速输入、Ctrl+Enter 保存，减少一切干扰
2. **数据即 Markdown** — 所有 memo 以 `.md` 文件存储，不锁定用户数据
3. **视觉化回顾** — 卡片瀑布流 + 热力图 + 随机回顾，促进知识内化
4. **多端一致** — 桌面与移动端统一体验，特别优化了移动端键盘交互
5. **国际化** — 原生支持中文和英文，自动跟随 Obsidian 语言设置

---

## 核心功能详解

### 1. 快速捕捉（CaptureItemView）

独立的全屏 Tab 视图，替代传统 Modal 方案以解决移动端虚拟键盘挤压布局的问题。

**入口方式：**
- 侧边栏图标（ribbon icon）
- 命令面板 `Cmd/Ctrl+P` → "Quick capture"
- URI 协议 `obsidian://memo?content=...`
- iOS 入口笔记触发（配置 Quick Capture.md）

**输入功能：**
- Textarea 文本输入框，支持多行
- **Pill 式标签 UI** — 以药丸标签形式添加/删除标签，完整支持 IME 输入法（compositionstart/compositionend 事件处理）
- **图片插入** — 点击按钮打开 `ImageSuggestModal`，搜索 vault 中的图片文件，插入 `![[image]]` 语法
- **笔记链接** — 输入 `[[` 自动触发 `NoteSuggestModal`，搜索 vault 中的笔记，插入 `[[note]]` Wikilink
- **心情选择器**（可选）— emoji 按钮组，选择后写入 frontmatter `mood` 字段
- **来源选择器**（可选）— 文本按钮组，标记 memo 来源（thought/kindle/web 等），写入 frontmatter `source` 字段
- **固定标签提示** — 若设置中启用固定标签，捕获界面会显示提示
- **Ctrl+Enter** 快捷保存
- 保存失败时显示可视化错误提醒（Notice）

### 2. 卡片瀑布流视图（MemosView）

侧边栏 `ItemView`，以卡片形式展示所有 memo，是插件的主界面。

**展示与交互：**
- 从配置文件夹递归加载所有 `type: memo` 的 Markdown 文件
- 按日期分组排列（最新优先），日期标题作为分隔线
- 顶部工具栏：memo 计数、新建按钮、随机回顾按钮、Canvas 导出按钮
- 搜索框支持关键词搜索
- **标签过滤** — 点击 memo 卡片上的标签胶囊（pill），即可过滤出包含该标签的所有 memo
- **日期过滤** — 点击热力图单元格，过滤出该日期的 memo
- 标签 + 日期 + 搜索三重过滤可叠加

**内容渲染：**
- 内嵌图片渲染 — `![[image.png]]` 直接显示图片
- Wikilink 渲染 — `[[note]]` 显示为可点击链接，支持 hover 预览（使用 Obsidian 原生 `app.workspace.trigger('hover-link')` API）
- 行内标签高亮 — `#标签` 渲染为可点击的彩色胶囊
- 心情 emoji 和来源标记在卡片上展示

**性能优化：**
- 防抖刷新机制（300ms debounce），监听 vault 的 create/delete/modify/rename 事件
- 避免频繁的全量重新渲染

### 3. 标签系统

插件的标签系统支持多种来源和完整的多语言字符集。

| 标签类型 | 说明 | 存储位置 |
|---------|------|---------|
| **行内标签** | 从 memo 正文中自动提取 `#标签` | 正文中直接书写 |
| **frontmatter 标签** | YAML `tags` 数组中的标签 | frontmatter |
| **固定标签** | 用户配置的自动添加标签 | frontmatter |
| **Pill 输入标签** | 捕获界面中以 pill 形式手动添加 | frontmatter |

**字符支持：** 正则表达式 `/#([\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af/-]+)/g` 覆盖：
- 拉丁字母、数字、下划线
- 中文（CJK 统一表意文字 `\u4e00-\u9fff`）
- 日文平假名 `\u3040-\u309f` + 片假名 `\u30a0-\u30ff`
- 韩文音节 `\uac00-\ud7af`
- 连字符 `-` 和斜杠 `/`

### 4. 统计与热力图（Stats）

纯函数式实现，挂载在 MemosView 顶部。

- **GitHub 风格热力图** — 7 行 × 17 列网格（CSS Grid），展示过去 17 周的 memo 活跃度
- **5 级颜色深度** — Level 0（0 条）/ Level 1（1 条）/ Level 2（2-3 条）/ Level 3（4-6 条）/ Level 4（7+ 条）
- **Tooltip** — 悬停显示日期和 memo 数量
- **日期过滤** — 点击热力图单元格即可按日期过滤卡片视图
- **统计面板** — 四个指标卡：总计、连续天数、今日、本月
- **可折叠** — 折叠状态持久化到插件设置
- **主题适配** — 通过 CSS 变量自动适配 Obsidian 亮色/暗色主题

### 5. 随机回顾

- 工具栏骰子按钮，点击后随机高亮一条 memo 卡片
- 带 CSS 脉冲动画效果（pulse animation），引导视觉焦点
- 适用于间隔重复式学习工作流，帮助回顾被遗忘的笔记

### 6. 图片导出（Export Image）

将单条 memo 导出为精美的 PNG 卡片图片，便于社交分享。

**技术实现：**
- **Canvas 2D 直接绘制** — 不使用 DOM 序列化或 foreignObject，确保跨平台一致性
- **两遍渲染** — 第一遍测量文本高度确定画布尺寸，第二遍绘制实际内容
- **字符级自动换行** — CJK 友好的换行算法，逐字符测量宽度
- **标签颜色区分** — `#tag` 文本使用主题色渲染
- **2x 像素比** — 输出 Retina 级别清晰度

**导出流程：**
1. 点击 memo 卡片的导出按钮
2. 弹出 `ExportModal` 预览窗口（DOM 卡片预览 + 主题切换）
3. 选择亮色/暗色主题（硬编码颜色值，保证输出一致性，不依赖当前 Obsidian 主题）
4. 桌面端：Save as PNG（下载）或 Copy to clipboard（剪贴板）
5. 移动端：优先使用 Web Share API 分享，降级保存到 vault 文件夹

**可选装饰：**
- 作者签名（底部显示）
- 品牌水印（"Quick Memos for Obsidian"）

### 7. Canvas 导出

将当前筛选后的 memo 集合导出为 Obsidian Canvas 文件（`.canvas`），用于可视化思维导图。

- 按首标签分组，形成列式布局（每列对应一个标签）
- 自动计算卡片坐标（x, y, width, height）
- 创建/覆盖 Canvas JSON 文件并自动在 Obsidian 中打开

### 8. Flomo 导入

从 Flomo 导出的 HTML 文件中批量解析并导入 memo，方便用户迁移数据。

**解析流程：**
1. 用户在设置页选择 HTML 文件
2. `DOMParser` 解析 HTML 结构（`.memo > .time + .content + .files`）
3. HTML → Markdown 转换（支持 `<p>`、`<ul>`/`<ol>`、`<blockquote>` 等元素）
4. 提取图片引用，转换为 `![[filename]]` 语法
5. 保留原始时间戳，自动提取行内标签
6. 生成带完整 frontmatter 的 `.md` 文件，`source` 字段标记为 `"flomo"`
7. 文件名去重（基于时间戳生成的文件名），自动跳过已存在的 memo

### 9. Memo 嵌入（Transclusion）

在其他笔记中使用 `![[memo-xxx]]` 嵌入 memo 时，自动应用卡片样式。

**三层检测机制：**
1. **CSS 属性选择器** — 根据文件路径匹配
2. **PostProcessor** — Obsidian MarkdownPostProcessor 回调中检测嵌入节点
3. **MutationObserver** — 监听 DOM 变化，处理异步加载的嵌入内容

检测标准：文件名匹配 memo 命名规范 + frontmatter `type: memo` 类型检测。

### 10. URI Handler

支持外部应用通过 URI 协议快速创建 memo：

```
obsidian://memo?content=你好世界&tags=想法,项目&mood=💡&source=kindle
```

| 参数 | 说明 | 必填 |
|------|------|------|
| `content` / `text` | Memo 正文内容 | 是 |
| `tags` | 逗号分隔的标签列表 | 否 |
| `mood` | 心情 emoji | 否 |
| `source` | 来源标记 | 否 |

**适配场景：** iOS 快捷指令、Alfred、Raycast、Apple Watch 等外部工具。

### 11. iOS Widget 集成

通过配置"入口笔记"实现与 iOS 小组件的联动：

1. 在设置中配置入口笔记路径（默认 `Quick Capture.md`）
2. 插件提供命令创建入口笔记
3. 当用户通过 iOS 小组件打开该笔记时，插件自动监听文件打开事件
4. 检测到入口笔记打开后，自动跳转到快速捕获视图

### 12. 右键菜单集成

在 Obsidian 编辑器中选中文本后，右键菜单出现 **"Save as Memo"** 选项，一键将选中文本保存为新的 memo 文件。

### 13. 国际化（i18n）

- 内置中文 + 英文两套完整翻译（305 行 i18n 模块）
- 自动检测 Obsidian 语言设置（`getLanguage()` API）
- 中文环境加载中文翻译，其他语言回退到英文
- 模块加载时一次性解析，运行时零开销
- 支持模板变量替换（`t("key", { var: value })` 语法）

---

## 技术栈

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| **开发语言** | TypeScript 5.5+ | 严格模式，ES2018 编译目标 |
| **构建工具** | esbuild 0.17+ | 极快的打包速度，支持 tree-shaking |
| **运行时** | Obsidian API (latest) | 依赖 ItemView、Plugin、MarkdownPostProcessor 等核心 API |
| **样式** | 原生 CSS | 1271 行，使用 CSS 变量适配主题，CSS Grid 布局热力图 |
| **包管理** | npm | 无运行时依赖，仅 devDependencies |
| **测试框架** | Vitest 2.1+ | 轻量快速，兼容 Vite 生态 |
| **图片导出** | Canvas 2D API | 2x 像素比，硬编码颜色保证跨主题一致性 |

---

## 架构设计

### 整体架构

项目采用**模块化多文件架构**，通过 `src/main.ts` 作为入口 re-export `MemosPlugin`。各模块职责单一、边界清晰，遵循关注点分离原则。

```
                     ┌─────────────────────┐
                     │      main.ts        │  入口，re-export plugin
                     └──────────┬──────────┘
                                │
                     ┌──────────▼──────────┐
                     │     plugin.ts       │  核心协调器：生命周期、路由、文件操作
                     └──┬────┬────┬────┬───┘
                        │    │    │    │
              ┌─────────┘    │    │    └──────────┐
              ▼              ▼    ▼               ▼
        ┌───────────┐  ┌────────────┐   ┌──────────────┐
        │  view.ts  │  │capture-view│   │  settings.ts │
        │ MemosView │  │   .ts      │   │SettingTab    │
        └─────┬─────┘  └────────────┘   └──────────────┘
              │
    ┌─────────┼──────────┐
    ▼         ▼          ▼
┌────────┐ ┌──────┐ ┌──────────────┐
│stats.ts│ │export│ │canvas-export │
│热力图   │ │-image│ │    .ts       │
└────────┘ │ .ts  │ └──────────────┘
           └──────┘

共享层：types.ts / constants.ts / utils.ts / memo-parser.ts / i18n.ts
```

### 核心模块详解

#### `plugin.ts` — MemosPlugin（244 行）
继承 `Plugin`，是插件的**中枢协调器**，负责所有 Obsidian API 的接入和模块间的桥接：

- **生命周期** — `onload()` 注册视图、命令、事件监听；`onunload()` 清理资源
- **设置管理** — `loadSettings()` / `saveSettings()` 持久化插件配置
- **视图管理** — 注册 `MemosView` 和 `CaptureItemView` 两个 ItemView，管理激活/切换逻辑
- **Memo 创建** — `createMemo(content, tags, mood, source)` 方法，生成带完整 YAML frontmatter 的 Markdown 文件
- **命令注册** — "Open Memos view"、"Quick capture" 两个命令面板命令
- **侧边栏图标** — 添加 ribbon icon，点击打开捕获视图
- **URI 协议** — `registerObsidianProtocolHandler("memo", ...)` 处理外部调用
- **右键菜单** — `registerEvent(editor-menu)` 添加 "Save as Memo" 选项
- **Transclusion** — `registerMarkdownPostProcessor` + `MutationObserver` 处理 memo 嵌入样式
- **iOS 入口** — 监听 `file-open` 事件，检测入口笔记触发捕获

#### `view.ts` — MemosView（529 行）
继承 `ItemView`，侧边栏卡片瀑布流视图，是用户的**主要交互界面**：

- **数据加载** — 从配置文件夹递归遍历所有 `.md` 文件，通过 `MetadataCache` 读取 frontmatter，筛选 `type: memo` 的文件
- **Memo 解析** — 调用 `parseMemoContent()` 剥离 frontmatter、合并标签
- **日期分组** — 按 `dateLabel`（YYYY-MM-DD）分组，最新日期在前
- **搜索过滤** — 关键词搜索 + 标签点击过滤 + 热力图日期过滤，三重过滤可叠加
- **内容渲染** — 纯 DOM API 构建卡片内容（XSS 安全），处理图片嵌入、Wikilink 渲染、标签高亮
- **hover 预览** — Wikilink 鼠标悬停触发 Obsidian 原生 hover-link 事件
- **统计面板** — 调用 `stats.ts` 渲染热力图和统计数据
- **随机回顾** — 随机选择一条 memo，滚动到位并添加脉冲动画
- **防抖刷新** — 监听 vault 事件（create/delete/modify/rename），300ms 防抖后刷新

#### `capture-view.ts` — CaptureItemView（398 行）
继承 `ItemView`，全屏快速捕获视图。设计为**独立 Tab**（而非 Modal），以解决移动端虚拟键盘遮挡问题：

- **文本输入** — `<textarea>` 元素，自动聚焦
- **Pill 标签** — 动态添加/删除标签，每个标签渲染为可点击的 pill 元素，带删除按钮
- **IME 兼容** — 通过 `compositionstart`/`compositionend` 事件正确处理中文/日文输入法
- **图片弹窗** — `ImageSuggestModal`（继承 `SuggestModal`），搜索 vault 中的图片文件
- **笔记弹窗** — `NoteSuggestModal`（继承 `SuggestModal`），输入 `[[` 自动触发
- **心情选择器** — emoji 按钮组，支持选中/取消选中状态
- **来源选择器** — 文本按钮组，同上
- **快捷保存** — `Ctrl+Enter` / `Cmd+Enter` 触发保存
- **返回按钮** — 保存后自动切回 MemosView

#### `export-image.ts` — 图片导出系统（706 行）
基于 Canvas 2D API 的 PNG 图片生成系统，是代码量最大的模块：

- **ExportModal** — 导出预览弹窗，包含 DOM 预览卡片 + 主题切换（亮/暗）+ 操作按钮
- **内容解析** — 将 memo 文本解析为段落数组，识别 `#tag` 并标记颜色
- **字符级换行** — 逐字符测量文本宽度，遇到宽度溢出时换行，CJK 字符可在任意位置断行
- **两遍渲染** — Pass 1 测量总高度确定画布尺寸 → Pass 2 绘制实际内容
- **主题系统** — 亮色/暗色两套硬编码颜色配置（背景、文字、标签、分割线等）
- **装饰元素** — 可选的作者签名和品牌水印
- **导出方式** — `canvas.toBlob()` → 桌面端下载/剪贴板，移动端 Web Share API / vault 保存

#### `canvas-export.ts` — Canvas 文件导出（99 行）
将 memo 集合导出为 Obsidian Canvas JSON 格式：

- 按首标签分组，每组形成一列
- 计算每张卡片的坐标位置（x/y/width/height）
- 输出 Obsidian Canvas JSON 格式（`{ nodes: [...], edges: [] }`）
- 创建/覆盖 `.canvas` 文件并自动打开

#### `flomo-import.ts` — Flomo 数据导入（186 行）
解析 Flomo 导出的 HTML 文件，批量转换为 memo Markdown 文件：

- `DOMParser` 解析 HTML DOM 结构
- 遍历 `.memo` 元素，提取 `.time`（时间戳）、`.content`（正文）、`.files`（附件）
- HTML 元素 → Markdown 转换规则：`<p>` → 段落、`<ul>/<ol>` → 列表、`<blockquote>` → 引用
- 提取图片 `<img>` 引用，转换为 `![[filename]]`
- 自动提取正文中的行内标签
- 基于时间戳生成文件名（`memo-YYYYMMDD-HHmmss.md`），已存在则跳过
- `source` 字段标记为 `"flomo"`

#### `stats.ts` — 统计系统（212 行）
纯函数式实现，无副作用，易于测试：

- `computeStats(memos)` — 输入 MemoNote 数组，输出 MemoStats（总计/连续/今日/本月/每日计数）
- `computeStreak(dailyCounts)` — 从今天倒推，计算连续签到天数
- `renderHeatmap(container, stats, onDateClick)` — 渲染 7×17 CSS Grid 热力图
- `renderStatsSection(container, stats, collapsed, onToggle, onDateClick)` — 渲染可折叠统计面板
- `getLevel(count)` — 将 memo 数量映射为 0-4 的颜色等级

#### `settings.ts` — 设置面板（207 行）
继承 `PluginSettingTab`，在 Obsidian 设置页中渲染插件配置界面：

- 基础设置：保存文件夹路径、固定标签开关与值
- 扩展元数据：心情 emoji 选择器开关与选项列表、来源标记开关与选项列表
- 图片导出：作者名显示开关与文本、品牌水印开关
- Flomo 导入：HTML 文件选择按钮 + 导入逻辑
- iOS 集成：入口笔记路径配置

#### `i18n.ts` — 国际化模块（305 行）
完整的中英文翻译系统：

- `Messages` 接口定义所有 UI 文本键（100+ 个字段）
- `en` 和 `zh` 两个完整的翻译对象
- `t(key, vars?)` 辅助函数，支持 `${var}` 模板变量替换
- `isChinese()` 检测当前语言环境
- 模块加载时一次性解析，导出 `i18n` 常量供全局使用

#### `memo-parser.ts` — Memo 解析器（40 行）
纯函数式 memo 内容解析：

- `parseMemoContent(file, content, cache)` — 剥离 YAML frontmatter，提取正文
- 合并 frontmatter `tags` + 正文行内 `#tags`，去重
- 利用 `MetadataCache` 的 `position.end.offset` 精确定位 frontmatter 结束位置

#### `types.ts` — 类型定义（47 行）
核心数据模型和设置接口：

```typescript
MemoNote {
  file: TFile       // Obsidian 文件引用
  content: string   // 正文（不含 frontmatter）
  tags: string[]    // 合并后的标签列表
  created: string   // ISO 8601 创建时间
  dateLabel: string  // "YYYY-MM-DD" 用于分组
  mood: string      // 心情 emoji（或空字符串）
  source: string    // 来源标记（或空字符串）
}

MemoStats {
  total: number                    // memo 总数
  streak: number                   // 连续天数
  today: number                    // 今日 memo 数
  thisMonth: number                // 本月 memo 数
  dailyCounts: Map<string, number> // 日期 → 数量映射
}

MemosSettings {
  saveFolder: string               // 默认 "Memos"
  useFixedTag: boolean             // 默认 false
  fixedTag: string                 // 默认 ""
  statsCollapsed: boolean          // 默认 false
  authorName: string               // 默认 ""
  showAuthorInExport: boolean      // 默认 false
  showBrandingInExport: boolean    // 默认 true
  enableMood: boolean              // 默认 false
  enableSource: boolean            // 默认 false
  moodOptions: string[]            // 默认 ["💡","🤔","😊","😤","📖"]
  sourceOptions: string[]          // 默认 ["thought","kindle","web","conversation","podcast"]
}
```

#### `utils.ts` — 工具函数（20 行）
- `extractInlineTags(text)` — 从文本中提取 `#tag`，返回标签名数组（不含 `#`）
- `parseTags(input)` — 解析用户输入的标签字符串，支持空格、英文逗号、中文逗号分隔

#### `constants.ts` — 常量定义（8 行）
- `VIEW_TYPE_MEMOS` = `"memos-view"` — 卡片视图类型标识
- `VIEW_TYPE_CAPTURE` = `"memos-capture-view"` — 捕获视图类型标识
- `INLINE_TAG_RE` — 行内标签正则（覆盖拉丁文 + CJK）
- `WIKILINK_RE` — Wikilink 匹配正则（`[[link]]` 和 `[[link|alias]]`，排除 `![[embed]]`）

---

## 数据模型

### Memo 文件格式

每条 Memo 以独立的 Markdown 文件存储在用户配置的文件夹中（默认 `Memos/`），包含标准 YAML frontmatter：

```markdown
---
created: 2026-03-14T14:30:00.000Z
type: memo
tags:
  - 想法
  - 项目
mood: "💡"
source: "kindle"
status: active
---

今天有个新功能的好想法。#兴奋
```

### Frontmatter 字段说明

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `created` | ISO 8601 字符串 | ✅ | 创建时的本地时间 | memo 创建时间，用于排序和分组 |
| `type` | `"memo"` | ✅ | `"memo"` | 文件类型标识，用于区分 memo 与普通笔记 |
| `tags` | `string[]` | 否 | `[]` | 标签列表（不含 `#` 前缀） |
| `mood` | `string` | 否 | — | 心情 emoji，仅在启用心情功能时添加 |
| `source` | `string` | 否 | — | 来源标记，仅在启用来源功能时添加 |
| `status` | `"active"` | 否 | `"active"` | 状态字段（预留扩展） |

### 文件命名规则

文件名格式：`memo-YYYYMMDD-HHmmss.md`（基于创建时间的本地时间生成）

### 与 Obsidian 生态的兼容性

- **Dataview** — 可通过 `type: memo` + `mood` / `source` 字段进行查询
- **Graph View** — 通过 `[[note]]` Wikilink 与其他笔记建立连接
- **搜索** — 标准 Markdown 文件，完全兼容 Obsidian 全文搜索
- **标签面板** — frontmatter tags 和行内 `#tags` 都会出现在 Obsidian 标签面板中

---

## 用户可配置项

| 设置项 | 默认值 | 类型 | 说明 |
|--------|-------|------|------|
| 保存文件夹 | `Memos` | 文本 | 新 memo 的保存目录（相对于 vault 根目录） |
| 启用固定标签 | `false` | 开关 | 是否为每条 memo 自动添加指定标签 |
| 固定标签值 | `""` | 文本 | 自动添加的标签名（不含 `#` 前缀） |
| 统计面板折叠 | `false` | 开关 | 是否默认折叠统计面板 |
| 启用心情 | `false` | 开关 | 捕获时显示心情 emoji 选择器 |
| 心情选项 | `💡, 🤔, 😊, 😤, 📖` | 文本 | 逗号分隔的 emoji 列表 |
| 启用来源 | `false` | 开关 | 捕获时显示来源选择器 |
| 来源选项 | `thought, kindle, web, conversation, podcast` | 文本 | 逗号分隔的来源标签列表 |
| 显示作者名 | `false` | 开关 | 导出图片时显示作者签名 |
| 作者名 | `""` | 文本 | 导出图片上的作者名 |
| 显示品牌 | `true` | 开关 | 导出图片显示 "Quick Memos for Obsidian" |

---

## 安全与质量

### XSS 防护
- **所有用户输入**均通过纯 DOM API（`document.createElement` + `textContent`）构建，**不使用 `innerHTML`**
- 已移除旧代码中的 `escapeHtmlAttr()` 函数（不再需要 HTML 字符串拼接）

### 性能优化
- 防抖刷新（300ms debounce）避免 vault 事件风暴
- 图片懒加载
- Canvas 2D 直接绘制（避免 DOM 序列化开销）
- 统计计算为纯函数，可独立缓存

### 移动端适配
- CaptureItemView（Tab 视图）替代 Modal，避免虚拟键盘遮挡
- IME 输入法兼容（compositionstart/compositionend）
- 移动端图片导出使用 Web Share API + vault 降级保存

### 时间处理
- 统一使用本地时间创建文件名和 frontmatter
- `dateLabel` 使用 `YYYY-MM-DD` 格式确保日期分组正确

---

## 测试覆盖

| 测试文件 | 行数 | 测试内容 |
|---------|------|---------|
| `tests/utils.test.ts` | 80 行 | `extractInlineTags`（CJK 字符、多标签、无标签等）、`parseTags`（逗号/中文逗号/空格分隔） |
| `tests/memo-parser.test.ts` | 126 行 | `parseMemoContent`（frontmatter 剥离、标签合并、无 frontmatter 处理、空内容） |
| `tests/stats.test.ts` | 278 行 | `computeStats`（基础计算、空数据）、`computeStreak`（连续/中断/今天无数据）、`getLevel`（5 级映射） |
| `tests/export-image.test.ts` | 120 行 | 图片导出相关功能测试 |
| `tests/flomo-import.test.ts` | 110 行 | Flomo 导入解析逻辑测试 |
| `tests/__mocks__/obsidian.ts` | 45 行 | Obsidian API mock（TFile、Notice、Plugin 等） |

**运行命令：** `npm run test`（Vitest）

---

## 构建与开发

```bash
npm install          # 安装依赖
npm run dev          # 开发模式（esbuild watch + source map）
npm run build        # 生产构建（esbuild + tree-shaking，无 source map）
npm run test         # 运行 Vitest 单元测试
npm run typecheck    # TypeScript 类型检查（tsc --noEmit）
```

### 开发环境要求
- Node.js（推荐 18+）
- npm
- Obsidian 开发者模式（设置 → 社区插件 → 开启开发者模式）

### 构建产物
- `main.js` — 打包后的插件代码（单文件 bundle）
- `manifest.json` — 插件元数据
- `styles.css` — 插件样式

---

## 项目结构

```
obsidian-memos/
├── src/                            # 源代码（14 个模块，3002 行）
│   ├── main.ts                     # 入口文件（re-export plugin）
│   ├── plugin.ts                   # 插件核心协调器（244 行）
│   ├── view.ts                     # 卡片瀑布流视图（529 行）
│   ├── capture-view.ts             # 快速捕获视图（398 行）
│   ├── export-image.ts             # PNG 图片导出（706 行）
│   ├── canvas-export.ts            # Canvas 文件导出（99 行）
│   ├── flomo-import.ts             # Flomo HTML 导入（186 行）
│   ├── stats.ts                    # 统计与热力图（212 行）
│   ├── settings.ts                 # 设置面板（207 行）
│   ├── i18n.ts                     # 国际化模块（305 行）
│   ├── memo-parser.ts              # Memo 内容解析（40 行）
│   ├── types.ts                    # 类型定义与默认值（47 行）
│   ├── utils.ts                    # 工具函数（20 行）
│   └── constants.ts                # 常量定义（8 行）
├── tests/                          # 测试代码（5 个测试文件 + mock，759 行）
│   ├── __mocks__/obsidian.ts       # Obsidian API mock（45 行）
│   ├── utils.test.ts               # 工具函数测试（80 行）
│   ├── memo-parser.test.ts         # Memo 解析器测试（126 行）
│   ├── stats.test.ts               # 统计函数测试（278 行）
│   ├── export-image.test.ts        # 图片导出测试（120 行）
│   └── flomo-import.test.ts        # Flomo 导入测试（110 行）
├── styles.css                      # UI 样式（1271 行）
├── main.js                         # 构建产物
├── manifest.json                   # 插件元数据（id, name, version, minAppVersion）
├── package.json                    # 依赖与脚本
├── tsconfig.json                   # TypeScript 配置
├── esbuild.config.mjs              # esbuild 构建配置（45 行）
├── vitest.config.ts                # Vitest 测试配置
├── README.md                       # 用户文档（中文）
├── README.en.md                    # 用户文档（英文）
├── start.md                        # 代码审查指南
├── versions.json                   # 版本兼容性映射
└── openspec/                       # OpenSpec 工作流目录
    ├── config.yaml                 # OpenSpec 配置（schema: spec-driven）
    ├── project.md                  # 项目概览（本文件）
    ├── changes/                    # 变更规格文档
    │   ├── export-image/           # 图片导出功能
    │   ├── fix-mobile-capture-modal/ # 移动端捕获修复
    │   ├── refactor-capture-to-itemview/ # 捕获视图重构
    │   └── archive/                # 已归档的变更
    │       ├── 2026-03-14-fix-code-quality-issues
    │       ├── 2026-03-14-refactor-and-add-tests
    │       ├── 2026-03-15-heatmap-stats
    │       └── 2026-03-16-v1217-improvements
    └── specs/                      # 功能规格文档
        ├── image-capture/          # 图片捕捉规格
        ├── modular-structure/      # 模块化结构规格
        ├── optimized-vault-io/     # Vault IO 优化规格
        ├── unit-testing/           # 单元测试规格
        └── xss-safe-rendering/     # XSS 安全渲染规格
```

---

## 关键指标

| 指标 | 数值 |
|------|------|
| **源代码总量** | 3002 行（src/ 目录，14 个模块） |
| **样式代码** | 1271 行（styles.css） |
| **测试代码** | 759 行（5 个测试文件 + mock） |
| **构建配置** | 45 行（esbuild.config.mjs） |
| **模块数量** | 14 个（src/） |
| **测试文件** | 5 个（+ 1 个 mock 文件） |
| **支持语言** | 中文 + 英文 |
| **运行时依赖** | 0（仅 devDependencies） |

---

## 依赖项

| 包名 | 版本 | 类型 | 说明 |
|------|------|------|------|
| `obsidian` | latest | devDependency | Obsidian 插件 API 类型定义 |
| `typescript` | ^5.5.0 | devDependency | TypeScript 编译器 |
| `esbuild` | ^0.17.3 | devDependency | JavaScript 打包工具 |
| `vitest` | ^2.1.0 | devDependency | 测试框架 |
| `@types/node` | ^22.19.15 | devDependency | Node.js 类型定义 |
| `builtin-modules` | ^3.3.0 | devDependency | Node.js 内置模块列表（esbuild 排除用） |

> 注：插件无任何运行时依赖，所有包均为 devDependencies，最终打包为单文件 `main.js`。

---

## 已知注意事项

1. **Flomo 导入兼容性** — HTML 解析依赖 DOMParser 和特定的 CSS 类名（`.memo`、`.time`、`.content`、`.files`），Flomo 导出格式变更可能需要适配解析逻辑
2. **防抖策略** — 300ms 防抖处理 vault 事件，在极端高频操作场景下可能有短暂延迟
3. **标签正则维护** — CJK 正则范围需要谨慎更新，修改时应充分测试边界情况
4. **XSS 安全** — 已全面使用纯 DOM API 构建用户内容，禁止引入 innerHTML
5. **时间一致性** — 保存/加载操作中统一使用本地时间，避免时区转换导致的日期分组错误
6. **图片导出颜色** — Canvas 2D 使用硬编码颜色值（不读取 CSS 变量），保证导出图片跨主题一致
7. **移动端键盘** — CaptureItemView（Tab 视图）方案已解决虚拟键盘问题，不应回退到 Modal 方案
8. **i18n 限制** — 切换 Obsidian 语言后需重启应用才能生效（模块加载时一次性解析）

---

## 相关文档

| 文件 | 说明 |
|------|------|
| `README.md` | 用户文档（中文，仓库默认展示） |
| `README.en.md` | 用户文档（英文版） |
| `start.md` | 代码审查指南与质量改进记录 |
| `manifest.json` | 插件元数据（id、name、version、minAppVersion） |
| `versions.json` | 版本 → 最低 Obsidian 版本映射 |
| `openspec/config.yaml` | OpenSpec 工作流配置 |
