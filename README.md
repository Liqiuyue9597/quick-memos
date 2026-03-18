<div align="center">

# Quick Memos 🧠

**像 Flomo 一样，在 Obsidian 里随手记录灵感**

[![Latest Release](https://img.shields.io/github/release/Liqiuyue9597/obsidian-memos.svg)](https://github.com/Liqiuyue9597/obsidian-memos/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**🌐 [English](README.en.md) | 中文**

</div>

---

## 这是什么

Quick Memos 是一个 Obsidian 插件，让你在笔记库里像用 Flomo 一样快速记录。

几秒钟写下想法，用卡片流浏览，按标签筛选，随机回顾旧灵感。所有数据都是本地 Markdown 文件，完全属于你自己。

主要是为了给手机端📱使用的灵感记录插件，直接从Flomo导入之前的笔记。

### 核心功能
- **移动端适配** — 支持 iOS 快捷指令入口
- **图片导出** — 把单条 memo 导出为精美的 PNG 卡片图，支持自定义作者名和品牌标识
- **Canvas 导出** — 一键将当前筛选的 memo 发送到 Obsidian Canvas，按标签分列排布
- **右键存 Memo** — 选中任意文本，右键「保存为 Memo」
- **Wikilink 支持** — 在捕获界面输入 `[[` 即可搜索并插入笔记链接
- **嵌入样式** — 在其他笔记中 `![[memo]]` 时自动渲染为卡片样式
- **Flomo 导入** — 一键导入 Flomo 导出的 HTML，保留时间和标签

---

## 安装

### 手动安装

```bash
git clone https://github.com/Liqiuyue9597/obsidian-memos.git
cd obsidian-memos
npm install
npm run build
```

将 `main.js`、`manifest.json`、`styles.css` 复制到你的 vault：

```
<你的vault>/.obsidian/plugins/obsidian-memos/
```

或者用软链接（开发时推荐）：

```bash
# macOS / Linux
ln -s /path/to/obsidian-memos /path/to/vault/.obsidian/plugins/obsidian-memos

# Windows (PowerShell 管理员)
New-Item -ItemType SymbolicLink `
  -Path "C:\vault\.obsidian\plugins\obsidian-memos" `
  -Target "C:\obsidian-memos"
```

在 Obsidian 中启用：**设置 → 社区插件 → 启用 Quick Memos**

### 使用 BRAT

1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件
2. BRAT → **Add a beta plugin** → 输入 `https://github.com/Liqiuyue9597/obsidian-memos`
3. 点击 **Add Plugin**

---

## 使用方法

### 基本操作

| 操作 | 方式 |
|------|------|
| 打开捕获界面 | 点击丝带图标 📝 / 命令面板 → `Memos: Quick capture` |
| 保存 memo | `Ctrl+Enter` 或点击保存按钮 |
| 打开卡片视图 | 命令面板 → `Memos: Open Memos view` |
| 按标签筛选 | 点击任意标签 |
| 按日期筛选 | 点击热力图上的格子 |
| 清除筛选 | 点击筛选标签上的 × |
| 随机回顾 | 工具栏骰子图标 🎲 |
| 导出到 Canvas | 工具栏 Canvas 图标 |
| 分享为图片 | 卡片右下角分享按钮 |
| 打开 memo 源文件 | 点击卡片 |
| 右键存选中文本 | 选中文本 → 右键 → 保存为 Memo |

### Memo 文件格式

每条 memo 保存为一个独立的 Markdown 文件：

```markdown
---
created: 2026-03-14T14:30:00.000Z
type: memo
tags:
  - idea
  - project
mood: "💡"
source: "thought"
status: active
---

今天想到了一个很棒的功能！#excited
```

- `type: memo` — 必需，用于识别 memo 文件
- `tags` — 自动合并 frontmatter 标签和正文中的 `#标签`
- `mood` / `source` — 可选，需在设置中开启

---

### iOS 快捷指令
从 Obsidian 外部创建 memo：`obsidian://memo-view` 可直接打开卡片视图。
可以实现小组件直接打开Quick Memos的卡片流视图。

具体步骤：
1. 在 iOS 上打开快捷指令选择右上角的➕，然后在搜索操作栏中搜索「打开URL」
2. 在「URL」处填入 `obsidian://memo-view` 作为快捷指令的 URL
3. 点击顶部选择重新命名，选择新的logo。最后保存。
4. 保存后，你可以在 iOS 上通过快捷指令打开 Quick Memos 的卡片流视图。

---

## 从 Flomo 导入

1. Flomo → 设置 → 账号详情 → 导出，下载 `.zip`
2. 解压得到 `.html` 文件和 `file/` 图片文件夹
3. Obsidian → 设置 → Quick Memos → Import → **选择 HTML 文件**
4. （可选）将 `file/` 里的图片复制到 vault 的附件文件夹

**导入特点：**

- 保留 Flomo 原始记录时间
- 自动提取 `#标签` 写入 frontmatter
- 自动标记 `source: "flomo"`，方便 Dataview 区分
- 防重复 — 同一文件多次导入不会产生重复
- 图片引用自动转换为 `![[图片名]]`

---

## 设置项

| 设置 | 默认值 | 说明 |
|------|--------|------|
| 保存文件夹 | `00-Inbox` | memo 保存位置 |
| 固定标签 | 关 | 自动为每条 memo 添加指定标签 |
| 启用心情 | 关 | 显示心情选择器（emoji 可自定义） |
| 启用来源 | 关 | 显示来源选择器（选项可自定义） |
| 显示作者名 | 关 | 导出图片时显示你的名字 |
| 显示品牌标识 | 开 | 导出图片时显示「Quick Memos for Obsidian」 |

---

## 开发

```bash
npm install       # 安装依赖
npm run dev       # 开发模式（热重载）
npm run build     # 生产构建
npm run test      # 运行测试
```

### 项目结构

```
src/
├── plugin.ts          # 插件入口：命令注册、URI handler、右键菜单
├── view.ts            # 卡片视图：加载/渲染 memo、标签筛选、随机回顾
├── capture-view.ts    # 捕获界面：文本输入、标签/心情/来源选择、Wikilink
├── stats.ts           # 统计模块：热力图、连续天数、计数
├── export-image.ts    # 图片导出：Canvas 绘制 PNG + 预览弹窗
├── canvas-export.ts   # Canvas 导出：生成 Obsidian Canvas 文件
├── flomo-import.ts    # Flomo 导入：解析 HTML、生成 Markdown
├── memo-parser.ts     # Memo 解析：frontmatter + 正文处理
├── i18n.ts            # 国际化：中文 / 英文
├── types.ts           # 类型定义 & 默认设置
├── constants.ts       # 常量：视图类型、正则
├── utils.ts           # 工具函数：标签提取、HTML 转义
└── main.ts            # 入口文件
```

---

## 常见问题

**Q: Memo 保存在哪里？**
A: 默认在 `00-Inbox/` 文件夹，可在设置中修改。每条 memo 是一个独立的 `.md` 文件。

**Q: 手机上能用吗？**
A: 可以。移动端会自动打开卡片视图，捕获界面适配虚拟键盘。iOS 还可以配合快捷指令实现一键记录。

**Q: 如何备份？**
A: Memo 就是普通 Markdown 文件，用 Obsidian Sync、iCloud、Dropbox 或 Git 同步即可。

**Q: 能和 Dataview 一起用吗？**
A: 可以。所有 memo 都有 `type: memo` 的 frontmatter，开启心情和来源后还会有 `mood`、`source` 字段，可以用 Dataview 自由查询。

---

## 许可证

[MIT](LICENSE) — 自由使用、修改和分发。

---

<div align="center">

**Made with ❤️ by [@Liqiuyue9597](https://github.com/Liqiuyue9597)**

</div>
