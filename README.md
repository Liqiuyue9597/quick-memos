# obsidian-memos

A flomo-style quick capture and card review plugin for [Obsidian](https://obsidian.md).

Replace flomo with your own vault — capture fleeting thoughts instantly, browse them in a scrollable card view, filter by tag, and surface forgotten ideas with random review.

---

## Features

- **Quick Capture Modal** — open with a ribbon icon or command, type your thought, add tags, save with Ctrl+Enter
- **Card Waterfall View** — all memos in the right sidebar, grouped by date, newest first
- **Tag Filtering** — click any tag pill or inline `#tag` to filter the view
- **Random Review** — dice button highlights a random memo with a pulse animation
- **Configurable Save Folder** — save memos anywhere in your vault (default: `00-Inbox`)
- **Fixed Tag** — optionally stamp every memo with a fixed tag (e.g., `memo`)
- **Inline Tags** — `#tags` written directly in memo content are extracted automatically

---

## Installation

### Manual (Developer Build)

```bash
git clone https://github.com/elissali/obsidian-memos
cd obsidian-memos
npm install
npm run build
```

Then symlink or copy the folder into your vault's plugins directory:

```bash
ln -s /path/to/obsidian-memos /path/to/vault/.obsidian/plugins/obsidian-memos
```

In Obsidian: **Settings → Community plugins → enable "Memos"**

---

## Usage

| Action | How |
|---|---|
| Open capture modal | Click pencil icon in ribbon, or Cmd/Ctrl+P → "Memos: Quick capture" |
| Save memo | Ctrl+Enter or click Save button |
| Open Memos view | Cmd/Ctrl+P → "Memos: Open Memos view" |
| Filter by tag | Click any tag pill or inline `#tag` |
| Clear filter | Click × on the active filter pill in toolbar |
| Random review | Click dice icon in toolbar |
| Open memo file | Click anywhere on a card |

---

## Memo Format

Memos are saved as standard Markdown files with frontmatter:

```markdown
---
created: 2024-01-15T09:30:00.000Z
type: memo
tags:
  - idea
  - project
---

Had a great idea for a new feature today. #excited
```

The `type: memo` field is used to identify memo files — any file in the save folder without this frontmatter field will be ignored.

---

## Settings

| Setting | Default | Description |
|---|---|---|
| Save folder | `00-Inbox` | Folder where new memos are saved |
| Use fixed tag | off | Automatically add a tag to every memo |
| Fixed tag value | _(empty)_ | The tag to auto-add (without `#`) |

---

## Development

```bash
npm run dev    # watch mode with source maps
npm run build  # production build
```

---

## License

MIT
