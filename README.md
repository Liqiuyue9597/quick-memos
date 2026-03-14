<!-- README.md -->

<div align="center">

**🌐 Read this in other languages:** [English](README.md) | [中文](README.zh-CN.md)

</div>

# obsidian-memos 🧠

> **Flomo-style quick capture for Obsidian** — Capture fleeting thoughts instantly, review them in a beautiful card view.
>
> **像 Flomo 一样快速记录** — 在 Obsidian 中即时捕获灵感，用卡片视图优雅回顾。

[![Latest Release](https://img.shields.io/github/release/Liqiuyue9597/obsidian-memos.svg)](https://github.com/Liqiuyue9597/obsidian-memos/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📖 Overview | 项目介绍

**obsidian-memos** is a lightweight Obsidian plugin that brings Flomo-style quick capture to your vault. Write down ideas in seconds, browse them in a scrollable card waterfall, filter by tags, and rediscover forgotten thoughts with random review.

**obsidian-memos** 是一个轻量级 Obsidian 插件，为你的笔记库带来 Flomo 式的快速记录体验。几秒钟记下想法，在卡片瀑布流中浏览，按标签筛选，用随机回顾重新发现遗忘的灵感。

### ✨ Why Use This? | 为什么用它？

| Feature | 功能 |
|---------|------|
| ⚡ Quick Capture | 快速捕获 — 一键弹出输入框，Ctrl+Enter 保存 |
| 🎴 Card Waterfall | 卡片瀑布流 — 右侧边栏展示所有 memo，按日期分组 |
| 🏷️ Tag Filtering | 标签筛选 — 点击标签 pill 或 inline `#tag` 即可过滤 |
| 🎲 Random Review | 随机回顾 — 点击骰子图标，随机高亮一条旧 memo |
| 📱 Mobile Friendly | 移动端友好 — 适配虚拟键盘，支持 iOS Widget 快捷入口 |
| 🔒 Local First | 本地优先 — 所有数据存在你的 vault，无需云端 |

---

## 📸 Screenshots | 截图

> 🚧 **Coming Soon** — Screenshots will be added in the next release.
>
> **即将更新** — 截图将在下个版本添加。

<!-- TODO: Add screenshots -->
<!-- 
![Quick Capture Modal](screenshots/capture-modal.png)
*Quick Capture Modal — Type your thought, add tags, save*

![Card Waterfall View](screenshots/card-view.png)
*Card Waterfall View — Browse all memos, filter by tag*
-->

---

## 📦 Installation | 安装

### Option 1: Manual Install (Recommended for Developers) | 手动安装（开发者推荐）

```bash
# Clone the repository | 克隆仓库
git clone https://github.com/Liqiuyue9597/obsidian-memos.git
cd obsidian-memos

# Install dependencies | 安装依赖
npm install

# Build the plugin | 构建插件
npm run build
```

Then symlink to your Obsidian vault: | 然后软链接到你的 Obsidian 笔记库：

```bash
# macOS / Linux
ln -s /path/to/obsidian-memos /path/to/your-vault/.obsidian/plugins/obsidian-memos

# Windows (run as Administrator in PowerShell)
New-Item -ItemType SymbolicLink -Path "C:\path\to\your-vault\.obsidian\plugins\obsidian-memos" -Target "C:\path\to\obsidian-memos"
```

Enable in Obsidian: **Settings → Community plugins → Enable "Quick Memos"**

在 Obsidian 中启用：**设置 → 社区插件 → 启用 "Quick Memos"**

### Option 2: BRAT Plugin | 使用 BRAT 插件

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin in Obsidian
2. Open BRAT → **Add a beta plugin**
3. Enter repo URL: `https://github.com/Liqiuyue9597/obsidian-memos`
4. Click **Add Plugin**

---

## 🚀 Usage | 使用方法

| Action | 操作 | How | 如何操作 |
|--------|------|-----|----------|
| Open capture modal | 打开捕获弹窗 | Click ribbon icon 📝 or `Ctrl/Cmd+P` → "Memos: Quick capture" | 点击丝带图标或命令面板 |
| Save memo | 保存 memo | `Ctrl+Enter` or click Save button | 快捷键或点击保存按钮 |
| Open Memos view | 打开卡片视图 | `Ctrl/Cmd+P` → "Memos: Open Memos view" | 命令面板 |
| Filter by tag | 按标签筛选 | Click any tag pill or inline `#tag` | 点击标签 |
| Clear filter | 清除筛选 | Click × on the active filter pill | 点击筛选栏的 × |
| Random review | 随机回顾 | Click dice icon 🎲 in toolbar | 点击工具栏骰子图标 |
| Open memo file | 打开 memo 文件 | Click anywhere on a card | 点击卡片任意位置 |

### 📝 Memo Format | Memo 格式

Memos are saved as standard Markdown files with frontmatter:

Memo 保存为带 frontmatter 的标准 Markdown 文件：

```markdown
---
created: 2026-03-14T14:30:00.000+08:00
type: memo
tags:
  - idea
  - project
---

今天想到了一个很棒的插件功能！#excited #obsidian
```

- `type: memo` — Required for identification | 必需，用于识别 memo 文件
- `tags` — Auto-extracted from frontmatter + inline `#tags` | 自动从 frontmatter 和 inline 标签提取

---

## ⚙️ Settings | 设置

| Setting | 设置项 | Default | 默认值 | Description | 说明 |
|---------|--------|---------|--------|-------------|------|
| Save folder | 保存文件夹 | `00-Inbox` | Folder where memos are saved | memo 保存位置 |
| Use fixed tag | 使用固定标签 | `off` | Auto-add a tag to every memo | 自动为每条 memo 添加标签 |
| Fixed tag value | 固定标签值 | _(empty)_ | The tag to auto-add (without `#`) | 自动添加的标签（不含 #） |
| Capture note path | 捕获笔记路径 | `Quick Capture.md` | Entry note for iOS widget | iOS Widget 入口笔记 |

---

## 🛠️ Development | 开发

```bash
# Install dependencies | 安装依赖
npm install

# Development mode with hot reload | 开发模式（热重载）
npm run dev

# Production build | 生产构建
npm run build
```

### Project Structure | 项目结构

```
obsidian-memos/
├── main.ts              # Plugin core (all logic) | 插件核心
├── styles.css           # UI styles | 样式
├── manifest.json        # Plugin metadata | 插件元数据
├── package.json         # Dependencies & scripts | 依赖与脚本
├── tsconfig.json        # TypeScript config | TS 配置
└── esbuild.config.mjs   # Build config | 构建配置
```

---

## ❓ FAQ | 常见问题

**Q: Where are memos saved?**  
**A:** By default in `00-Inbox/` folder. You can change this in settings.

**Q: 保存的 memo 存在哪里？**  
**A:** 默认在 `00-Inbox/` 文件夹，可在设置中修改。

---

**Q: Can I use this on mobile?**  
**A:** Yes! The capture modal adapts to virtual keyboards. iOS users can set up a Widget for instant capture.

**Q: 手机上能用吗？**  
**A:** 可以！捕获弹窗会自动适配虚拟键盘。iOS 用户可设置 Widget 实现快速捕获。

---

**Q: How do I backup my memos?**  
**A:** Memos are regular Markdown files in your vault — sync with Obsidian Sync, iCloud, Dropbox, or Git.

**Q: 如何备份 memo？**  
**A:** Memo 是普通的 Markdown 文件，可用 Obsidian Sync、iCloud、Dropbox 或 Git 同步。

---

## 🤝 Contributing | 贡献

Contributions are welcome! Feel free to:

欢迎贡献！你可以：

- 🐛 Report bugs | 报告 bug
- 💡 Suggest features | 建议新功能
- 🔧 Submit PRs | 提交 PR
- 📝 Improve docs | 改进文档

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License | 许可证

MIT License — Free to use, modify, and redistribute. No attribution required.

MIT 许可证 — 可自由使用、修改和分发，无需署名。

---

## 🙏 Acknowledgments | 致谢

- Built with [Obsidian](https://obsidian.md) — A powerful knowledge base
- Inspired by [Flomo](https://flomoapp.com) — The art of capturing fleeting thoughts
- Co-developed with AI assistants | 与 AI 助手协作开发

---

<div align="center">

**Made with ❤️ by [@Liqiuyue9597](https://github.com/Liqiuyue9597)**

**Star ⭐ this repo if you find it useful!**

**如果觉得有用，请点个 Star ⭐！**

</div>
