<div align="center">

# Quick Memos 🧠

**Flomo-style quick capture for Obsidian**

[![Latest Release](https://img.shields.io/github/release/Liqiuyue9597/quick-memos.svg)](https://github.com/Liqiuyue9597/quick-memos/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**🌐 English | [中文](README.md)**

</div>

---

## What Is This

Quick Memos is an Obsidian plugin that brings Flomo-style quick capture to your vault.

Jot down ideas in seconds, browse them in a card waterfall, filter by tags, and rediscover forgotten thoughts with random review. Everything is stored as local Markdown files — your data, your rules.

Primarily designed as a mobile-friendly 📱 inspiration capture plugin, with direct import from Flomo.

### Features

- **Mobile Ready** — Supports iOS Shortcuts for quick access
- **Image Insert** — On iOS, open Photos and save into the vault’s attachment folder automatically; on desktop, use the native attachment/file picker flow
- **Image Export** — Export any memo as a beautiful PNG card with optional author name and branding
- **Canvas Export** — Send filtered memos to an Obsidian Canvas file, grouped by tag
- **Right-Click to Memo** — Select any text, right-click → Save as Memo
- **Tag Suggestions** — Show recent + frequent tags first when capturing, so you can tap instead of typing
- **Wikilink Support** — Type `[[` in the capture view to search and insert note links
- **Transclusion Styling** — `![[memo]]` embeds in other notes are auto-styled as cards
- **Flomo Import** — One-click import from Flomo HTML export, preserving timestamps and tags

---

## Installation

### Manual Install

```bash
git clone https://github.com/Liqiuyue9597/quick-memos.git
cd quick-memos
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into your vault, and make sure the plugin folder name is `quick-memos`:

```
<your-vault>/.obsidian/plugins/quick-memos/
```

Or symlink (recommended for development):

```bash
# macOS / Linux
ln -s /path/to/quick-memos /path/to/vault/.obsidian/plugins/quick-memos

# Windows (PowerShell as Admin)
New-Item -ItemType SymbolicLink `
  -Path "C:\vault\.obsidian\plugins\quick-memos" `
  -Target "C:\quick-memos"
```

> If the plugin is not recognized on mobile, double-check that the folder name is `quick-memos`.

Enable in Obsidian: **Settings → Community plugins → Enable Quick Memos**

### Using BRAT

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. BRAT → **Add a beta plugin** → enter `https://github.com/Liqiuyue9597/quick-memos`
3. Click **Add Plugin**

---

## Usage

### Basic Operations

| Action | How |
|--------|-----|
| Open capture view | Click ribbon icon 📝 / Command palette → `Memos: Quick capture` |
| Save memo | `Ctrl+Enter` or click Save button |
| Open card view | Command palette → `Memos: Open Memos view` |
| Insert image | Click the image button in the capture view; iOS opens Photos, desktop opens a file picker |
| Filter by tag | Click any tag |
| Filter by date | Click a heatmap cell |
| Clear filter | Click × on the filter pill |
| Random review | Dice icon 🎲 in toolbar |
| Export to Canvas | Canvas icon in toolbar |
| Share as image | Share button on card footer |
| Open memo source file | Click anywhere on a card |
| Save selected text | Select text → Right-click → Save as Memo |

### Memo File Format

Each memo is saved as an individual Markdown file:

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

Had a great idea for a new feature today! #excited
```

- `type: memo` — Required, used for identification
- `tags` — Auto-merged from frontmatter and inline `#tags`
- `mood` / `source` — Optional, enable in settings

### Tag Suggestions

In the quick capture view, the `Add tag` area shows recent and frequently used tags first. Tap one of the suggested tags to add it instantly; if nothing fits, use `Add tag` to type a new one.

---

### iOS Shortcuts

Open the card view from outside Obsidian: `obsidian://memo-view` opens the Quick Memos card waterfall directly. You can use this to create a home screen widget that launches Quick Memos.

Steps:
1. Open the **Shortcuts** app on iOS, tap the ➕ in the top right, then search for "Open URL" in the actions search bar
2. Enter `obsidian://memo-view` as the URL
3. Tap the title at the top to rename the shortcut and choose a new icon. Then save.
4. Once saved, you can open the Quick Memos card view on iOS via this shortcut.

---

## Import from Flomo

1. Flomo → Settings → Account → Export, download the `.zip`
2. Extract to get the `.html` file and `file/` image folder
3. Obsidian → Settings → Quick Memos → Import → **Choose HTML file**
4. (Optional) Copy images from `file/` into your vault's attachment folder

**Import highlights:**

- Preserves original Flomo timestamps
- Auto-extracts `#tags` into frontmatter
- Marks imported memos with `source: "flomo"` for Dataview filtering
- Deduplication — re-importing the same file won't create duplicates
- Image references auto-converted to `![[filename]]`

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Save folder | `00-Inbox` | Where memos are saved |
| Fixed tag | Off | Auto-add a tag to every memo |
| Enable mood | Off | Show mood picker (customizable emojis) |
| Enable source | Off | Show source picker (customizable labels) |
| Show author name | Off | Display your name on exported images |
| Show branding | On | Display "Quick Memos for Obsidian" on exported images |

---

## Development

```bash
npm install       # Install dependencies
npm run dev       # Dev mode with hot reload
npm run build     # Production build
npm run test      # Run tests
```

### Project Structure

```
src/
├── plugin.ts          # Plugin entry: commands, URI handlers, context menu
├── view.ts            # Card view: load/render memos, tag filtering, random review
├── capture-view.ts    # Capture view: text input, tags/mood/source, wikilink
├── stats.ts           # Stats: heatmap, streak, counters
├── export-image.ts    # Image export: Canvas-drawn PNG + preview modal
├── canvas-export.ts   # Canvas export: generate Obsidian Canvas files
├── flomo-import.ts    # Flomo import: parse HTML, generate Markdown
├── memo-parser.ts     # Memo parser: frontmatter + body processing
├── i18n.ts            # Internationalization: Chinese / English
├── types.ts           # Type definitions & default settings
├── constants.ts       # Constants: view types, regex patterns
├── utils.ts           # Utilities: tag extraction, HTML escaping
└── main.ts            # Entry point
```

---

## FAQ

**Q: Where are memos saved?**
A: By default in the `00-Inbox/` folder, configurable in settings. Each memo is a standalone `.md` file.

**Q: Does it work on mobile?**
A: Yes. The card view opens automatically on mobile, and the capture view adapts to virtual keyboards. iOS users can also set up Shortcuts for instant access.

**Q: How do I back up my memos?**
A: Memos are regular Markdown files — sync with Obsidian Sync, iCloud, Dropbox, or Git.

**Q: Can I use this with Dataview?**
A: Absolutely. All memos have `type: memo` in frontmatter. With mood and source enabled, you also get `mood` and `source` fields for rich Dataview queries.

---

## License

[MIT](LICENSE) — Free to use, modify, and redistribute.

---

<div align="center">

**Made with ❤️ by [@Liqiuyue9597](https://github.com/Liqiuyue9597)**

</div>
