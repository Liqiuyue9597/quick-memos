# obsidian-memos 项目概览

## 简介

**obsidian-memos** 是一款仿 flomo 风格的 Obsidian 快速捕捉与卡片回顾插件，专为轻量级笔记场景设计，帮助用户无摩擦地记录灵感闪念，并通过可视化卡片界面进行组织与回顾。

- **仓库地址**: https://github.com/elissali/obsidian-memos
- **当前版本**: 1.1.3
- **许可证**: MIT
- **最低 Obsidian 版本**: 1.4.0
- **作者**: elissali

## 项目愿景

让 Obsidian 用户能够快速、无摩擦地捕捉灵感与想法，并通过卡片式界面配合标签过滤和随机回顾功能，实现间隔重复式学习与知识管理。

## 核心功能

### 1. 快速捕捉弹窗
- 通过侧边栏图标或 Cmd/Ctrl+P 快捷键打开
- 轻量级文本输入，支持可选标签字段
- Ctrl+Enter 快速保存
- 移动端键盘自适应定位
- 错误处理与可视化提醒

### 2. 卡片瀑布流视图
- 侧边栏以卡片形式展示所有 memo
- 按日期分组排列（最新优先）
- 支持搜索与过滤
- 可点击的标签胶囊进行过滤
- 从 memo 内容中自动提取行内标签

### 3. 标签系统
- **行内标签**: 从 memo 文本中提取 `#标签`（支持中日韩字符）
- **固定标签**: 可配置为每条 memo 自动添加指定标签
- **标签过滤**: 点击标签胶囊即可按标签过滤视图
- 完整支持拉丁文、中文、日文、韩文字符

### 4. 随机回顾
- 骰子按钮随机高亮一条 memo，带脉冲动画效果
- 支持间隔重复式学习工作流
- 快速翻阅被遗忘的笔记

### 5. 灵活存储
- 可配置保存文件夹（默认: `00-Inbox`）
- 标准 Markdown 格式 + YAML frontmatter
- 支持 iOS 小组件集成

## 技术栈

| 组件 | 技术选型 |
|------|---------|
| **开发语言** | TypeScript（ES2018 目标） |
| **构建工具** | esbuild |
| **运行时** | Obsidian API（最新版） |
| **样式** | CSS |
| **包管理** | npm |

## 架构设计

### 单文件架构
全部插件逻辑集中在 `main.ts`（729 行），保持代码简洁和可维护性。

### 核心组件

#### MemosPlugin（继承 Plugin）
- 插件生命周期管理（onload/onunload）
- 设置持久化
- 视图激活与协调
- Memo 文件创建（含 YAML frontmatter）
- 快捷键与侧边栏图标注册

#### MemosView（继承 ItemView）
- 侧边栏卡片视图，展示全部 memo
- 从配置文件夹加载 memo
- 标签点击切换过滤
- 标签胶囊渲染
- 随机回顾功能（带脉冲动画）
- 防抖刷新（300ms）

#### CaptureModal（继承 Modal）
- 快速捕捉文本输入界面
- 标签字段（空格/逗号分隔）
- 保存按钮 + Ctrl+Enter 快捷键
- 移动端键盘自适应
- 错误处理与输入验证

#### MemosSettingTab（继承 PluginSettingTab）
- 配置保存文件夹
- 固定标签开关与值设定
- iOS 入口笔记路径设置

### 工具函数
- `extractInlineTags()` — 从文本中提取 `#标签`，支持中日韩字符
- `escapeHtmlAttr()` — XSS 安全的 HTML 属性转义
- `INLINE_TAG_RE` — 支持拉丁文、中文、日文、韩文的正则表达式

## 数据模型

### Memo 文件格式
Memo 以标准 Markdown 文件存储，包含 YAML frontmatter：

```markdown
---
created: 2024-01-15T09:30:00.000Z
type: memo
tags:
  - 想法
  - 项目
---

今天有个新功能的好想法。#兴奋
```

## 用户可配置项

| 设置项 | 默认值 | 说明 |
|--------|-------|------|
| 保存文件夹 | `00-Inbox` | 新 memo 的保存目录 |
| 启用固定标签 | 关闭 | 是否为每条 memo 自动添加标签 |
| 固定标签值 | （空） | 自动添加的标签（不含 `#` 前缀） |
| 入口笔记路径 | `Quick Capture.md` | iOS 小组件触发捕捉弹窗的入口文件 |

## 开发规范

### 代码质量
- TypeScript 严格模式
- XSS 防护（HTML 转义）
- 中日韩字符标签提取支持
- 性能防抖（300ms）
- Memo 保存错误处理
- 移动端键盘自适应
- macOS 快捷键适配显示

### 近期质量改进（详见 start.md）
- 修复标签渲染中的 XSS 漏洞
- 修复文件夹路径匹配 bug（改用 `folder + "/"` 前缀匹配）
- 添加防抖以避免性能问题
- 统一本地时间处理，防止冲突
- 扩展标签正则以支持中日韩字符
- 添加中文逗号分隔标签支持

## 构建与开发

```bash
npm run dev      # 开发模式（带 source map 的监听模式）
npm run build    # 生产构建（启用 tree-shaking）
```

## 项目结构

```
obsidian-memos/
├── main.ts              # 插件核心逻辑（729 行）
├── main.js              # 构建产物
├── styles.css           # UI 样式（约 340 行）
├── manifest.json        # 插件元数据
├── package.json         # 依赖与脚本
├── tsconfig.json        # TypeScript 配置
├── esbuild.config.mjs   # 构建配置
├── README.md            # 用户文档
├── start.md             # 代码审查指南
├── versions.json        # 版本兼容性
└── openspec/            # OpenSpec 工作流目录
    ├── config.yaml      # OpenSpec 配置
    ├── project.md       # 项目概览（本文件）
    ├── changes/         # 变更规格文档
    ├── specs/           # 功能规格文档
    └── archive/         # 已归档的变更
```

## 关键指标

- **主代码量**: 729 行（main.ts）
- **样式代码**: 约 340 行（styles.css）
- **构建配置**: 45 行（esbuild.config.mjs）
- **架构复杂度**: 单文件，最小依赖
- **性能优化**: 防抖刷新（300ms）

## 依赖项

- **obsidian**（latest）— Obsidian 插件 API
- **typescript**（^4.7.4）— TypeScript 编译器
- **esbuild**（^0.17.3）— JavaScript 打包工具

## 已知注意事项

1. **单文件架构** — 全部逻辑在 main.ts 中，简洁但随复杂度增长可能需要拆分重构
2. **防抖策略** — 使用 300ms 防抖处理 vault 事件以优化性能
3. **标签提取** — 支持中日韩的正则表达式在更新时需仔细测试
4. **XSS 防护** — 所有用户输入均进行转义以防止注入攻击
5. **时间处理** — 保存/加载操作中保持一致的本地时间处理

## 相关文档

- **README.md** — 用户文档与功能说明
- **start.md** — 代码审查指南与近期 bug 修复记录
- **manifest.json** — 插件元数据与 Obsidian 兼容性
- **versions.json** — 版本兼容性信息
