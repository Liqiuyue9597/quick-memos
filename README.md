<!-- README.md -->

<div align="center">

**🌐 Read this in other languages:** [English](README.md) | [中文](README.zh-CN.md)

</div>

# obsidian-memos 🧠

> Flomo-style quick capture for Obsidian — Capture fleeting thoughts instantly, review them in a beautiful card view.

[![Latest Release](https://img.shields.io/github/release/Liqiuyue9597/obsidian-memos.svg)](https://github.com/Liqiuyue9597/obsidian-memos/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📖 Overview

**obsidian-memos** is a lightweight Obsidian plugin that brings Flomo-style quick capture to your vault. Write down ideas in seconds, browse them in a scrollable card waterfall, filter by tags, and rediscover forgotten thoughts with random review.

### ✨ Why Use This?

| Feature | Description |
|---------|-------------|
| ⚡ Quick Capture | One-click modal, save with Ctrl+Enter |
| 🎴 Card Waterfall | Right sidebar view, grouped by date, newest first |
| 🏷️ Tag Filtering | Click any tag pill or inline `#tag` to filter |
| 🎲 Random Review | Click dice icon to highlight a random memo |
| 📱 Mobile Friendly | Adapts to virtual keyboards, iOS Widget support |
| 🔒 Local First | All data stays in your vault, no cloud required |

---

## 📸 Screenshots

> 🚧 **Coming Soon** — Screenshots will be added in the next release.

<!-- TODO: Add screenshots -->
<!-- 
![Quick Capture Modal](screenshots/capture-modal.png)
*Quick Capture Modal — Type your thought, add tags, save*

![Card Waterfall View](screenshots/card-view.png)
*Card Waterfall View — Browse all memos, filter by tag*
-->

---

## 📦 Installation

### Option 1: Manual Install (Recommended for Developers)

```bash
# Clone the repository
git clone https://github.com/Liqiuyue9597/obsidian-memos.git
cd obsidian-memos

# Install dependencies
npm install

# Build the plugin
npm run build
```

Then symlink to your Obsidian vault:

```bash
# macOS / Linux
ln -s /path/to/obsidian-memos /path/to/your-vault/.obsidian/plugins/obsidian-memos

# Windows (run as Administrator in PowerShell)
New-Item -ItemType SymbolicLink -Path "C:\path\to\your-vault\.obsidian\plugins\obsidian-memos" -Target "C:\path\to\obsidian-memos"
```

Enable in Obsidian: **Settings → Community plugins → Enable "Quick Memos"**

### Option 2: BRAT Plugin

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin in Obsidian
2. Open BRAT → **Add a beta plugin**
3. Enter repo URL: `https://github.com/Liqiuyue9597/obsidian-memos`
4. Click **Add Plugin**

---

## 🚀 Usage

| Action | How |
|--------|-----|
| Open capture modal | Click ribbon icon 📝 or `Ctrl/Cmd+P` → "Memos: Quick capture" |
| Save memo | `Ctrl+Enter` or click Save button |
| Open Memos view | `Ctrl/Cmd+P` → "Memos: Open Memos view" |
| Filter by tag | Click any tag pill or inline `#tag` |
| Clear filter | Click × on the active filter pill |
| Random review | Click dice icon 🎲 in toolbar |
| Open memo file | Click anywhere on a card |

### 📝 Memo Format

Memos are saved as standard Markdown files with frontmatter:

```markdown
---
created: 2026-03-14T14:30:00.000+08:00
type: memo
tags:
  - idea
  - project
---

Had a great idea for a new feature today. #excited #obsidian
```

- `type: memo` — Required for identification
- `tags` — Auto-extracted from frontmatter + inline `#tags`

---

## ⚙️ Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Save folder | `00-Inbox` | Folder where memos are saved |
| Use fixed tag | `off` | Auto-add a tag to every memo |
| Fixed tag value | _(empty)_ | The tag to auto-add (without `#`) |
| Capture note path | `Quick Capture.md` | Entry note for iOS widget |

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Production build
npm run build
```

### Project Structure

```
obsidian-memos/
├── main.ts              # Plugin core (all logic)
├── styles.css           # UI styles
├── manifest.json        # Plugin metadata
├── package.json         # Dependencies & scripts
├── tsconfig.json        # TypeScript config
└── esbuild.config.mjs   # Build config
```

---

## ❓ FAQ

**Q: Where are memos saved?**  
**A:** By default in `00-Inbox/` folder. You can change this in settings.

**Q: Can I use this on mobile?**  
**A:** Yes! The capture modal adapts to virtual keyboards. iOS users can set up a Widget for instant capture.

**Q: How do I backup my memos?**  
**A:** Memos are regular Markdown files in your vault — sync with Obsidian Sync, iCloud, Dropbox, or Git.

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

- 🐛 Report bugs
- 💡 Suggest features
- 🔧 Submit PRs
- 📝 Improve docs

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License — Free to use, modify, and redistribute. No attribution required.

---

## 🙏 Acknowledgments

- Built with [Obsidian](https://obsidian.md) — A powerful knowledge base
- Inspired by [Flomo](https://flomoapp.com) — The art of capturing fleeting thoughts
- Co-developed with AI assistants

---

<div align="center">

**Made with ❤️ by [@Liqiuyue9597](https://github.com/Liqiuyue9597)**

**Star ⭐ this repo if you find it useful!**

</div>
