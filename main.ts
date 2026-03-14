// =============================================================================
// Imports & Constants
// =============================================================================

import {
  App,
  ItemView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TFolder,
  WorkspaceLeaf,
  normalizePath,
  setIcon,
} from "obsidian";

const VIEW_TYPE_MEMOS = "memos-view";

// Shared tag regex — covers Latin, CJK (Chinese, Japanese, Korean), and common punctuation
const INLINE_TAG_RE = /#([\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af/-]+)/g;

/** Extract inline #tags from text, returning tag names without the leading '#'. */
function extractInlineTags(text: string): string[] {
  const tags: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(INLINE_TAG_RE.source, INLINE_TAG_RE.flags);
  while ((m = re.exec(text)) !== null) {
    tags.push(m[1]);
  }
  return tags;
}

/** Escape a string for safe insertion into an HTML attribute value. */
function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// =============================================================================
// Interfaces & Defaults
// =============================================================================

interface MemoNote {
  file: TFile;
  content: string;  // body text (no frontmatter)
  tags: string[];   // merged frontmatter + inline #tags
  created: string;  // ISO datetime string
  dateLabel: string; // "YYYY-MM-DD" for grouping
}

interface MemosSettings {
  saveFolder: string;        // default: "00-Inbox"
  useFixedTag: boolean;      // default: false
  fixedTag: string;          // default: ""
  captureNotePath: string;   // default: "Quick Capture.md"
}

const DEFAULT_SETTINGS: MemosSettings = {
  saveFolder: "00-Inbox",
  useFixedTag: false,
  fixedTag: "",
  captureNotePath: "Quick Capture.md",
};

// =============================================================================
// MemosPlugin
// =============================================================================

export default class MemosPlugin extends Plugin {
  settings!: MemosSettings;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_MEMOS, (leaf) => new MemosView(leaf, this));

    // Ribbon icon → open Memos view (fullscreen on mobile)
    this.addRibbonIcon("sticky-note", "Open Memos view", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-memos-capture",
      name: "Quick capture",
      callback: () => {
        new CaptureModal(this.app, this).open();
      },
    });

    this.addCommand({
      id: "open-memos-view",
      name: "Open Memos view",
      callback: () => {
        this.activateView();
      },
    });

    this.addCommand({
      id: "create-capture-note",
      name: "Create quick capture entry note",
      callback: async () => {
        const path = this.settings.captureNotePath;
        if (this.app.vault.getAbstractFileByPath(path)) {
          new Notice(`Entry note already exists: ${path}`);
          return;
        }
        const content = [
          "This note is used by the Memos plugin as a quick capture entry point.",
          "",
          "**How to use on iOS:**",
          "1. Long-press the Obsidian home screen widget",
          "2. Tap Edit Widget",
          '3. Set "Open a specific note" to this note',
          "4. Tapping the widget will open Obsidian and automatically show the capture dialog",
          "",
          "> Do not delete this note if you want the widget shortcut to work.",
        ].join("\n");
        await this.app.vault.create(path, content);
        new Notice(`Created entry note: ${path}`);
      },
    });

    // Listen for file-open events → auto-trigger CaptureModal for the entry note
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file && file.path === normalizePath(this.settings.captureNotePath)) {
          new CaptureModal(this.app, this).open();
        }
      })
    );

    this.addSettingTab(new MemosSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      this.activateView();
    });
  }

  onunload() {
    // Intentionally empty — do NOT detach leaves here.
    // Obsidian restores views in their original positions on plugin reload/update.
  }

  async activateView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_MEMOS);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE_MEMOS, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  async saveMemo(content: string, tags: string[]) {
    const now = new Date();
    const iso = now.toISOString();
    // Use local time consistently for both date and time portions
    const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const ms = pad(now.getMilliseconds(), 3);
    const filename = `memo-${dateStr}-${timeStr}-${ms}.md`;

    // Build tag list: fixed tag first, then user-provided tags
    const allTags: string[] = [];
    if (this.settings.useFixedTag && this.settings.fixedTag) {
      allTags.push(this.settings.fixedTag.replace(/^#+/, ""));
    }
    for (const t of tags) {
      const clean = t.replace(/^#+/, "");
      if (clean && !allTags.includes(clean)) {
        allTags.push(clean);
      }
    }

    const tagYaml =
      allTags.length > 0
        ? `tags:\n${allTags.map((t) => `  - ${t}`).join("\n")}`
        : "tags: []";

    const frontmatter = `---\ncreated: ${iso}\ntype: memo\n${tagYaml}\n---\n\n`;
    const fileContent = frontmatter + content;

    const folder = normalizePath(this.settings.saveFolder);

    // Ensure folder exists
    if (!this.app.vault.getAbstractFileByPath(folder)) {
      await this.app.vault.createFolder(folder);
    }

    const filePath = normalizePath(`${folder}/${filename}`);
    await this.app.vault.create(filePath, fileContent);

    // Refresh all open Memos views
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_MEMOS)) {
      const view = leaf.view;
      if (view instanceof MemosView) {
        await view.refresh();
      }
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// =============================================================================
// MemosView
// =============================================================================

class MemosView extends ItemView {
  plugin: MemosPlugin;
  activeTag: string | null = null;
  memos: MemoNote[] = [];
  highlightedCardEl: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: MemosPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_MEMOS;
  }

  getDisplayText(): string {
    return "Memos";
  }

  getIcon(): string {
    return "sticky-note";
  }

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  /** Debounced refresh — coalesces rapid vault events into a single refresh. */
  private debouncedRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.refresh();
    }, 300);
  }

  async onOpen() {
    this.contentEl.addClass("memos-view");
    await this.refresh();

    // Re-render on vault changes within the save folder (debounced)
    const folderPrefix = normalizePath(this.plugin.settings.saveFolder) + "/";
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file instanceof TFile && file.path.startsWith(folderPrefix)) this.debouncedRefresh();
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof TFile && file.path.startsWith(folderPrefix)) this.debouncedRefresh();
      })
    );
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile && file.path.startsWith(folderPrefix)) this.debouncedRefresh();
      })
    );
  }

  async onClose() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  async refresh() {
    await this.loadMemos();
    this.contentEl.empty();
    this.highlightedCardEl = null;

    const toolbar = this.contentEl.createDiv("memos-toolbar");
    this.renderToolbar(toolbar);

    const cardsContainer = this.contentEl.createDiv("memos-cards-container");
    this.renderCards(cardsContainer);
  }

  async loadMemos() {
    const folder = normalizePath(this.plugin.settings.saveFolder);
    const abstractFolder = this.app.vault.getAbstractFileByPath(folder);

    // Safety: if folder doesn't exist or isn't a TFolder, return empty
    if (!abstractFolder || !(abstractFolder instanceof TFolder)) {
      this.memos = [];
      return;
    }

    const files = abstractFolder.children.filter(
      (f): f is TFile => f instanceof TFile && f.name.endsWith(".md")
    );

    const results: MemoNote[] = [];

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter;
      if (!fm || fm["type"] !== "memo") continue;

      const raw = await this.app.vault.read(file);
      const memo = this.parseMemo(file, raw, fm, cache);
      results.push(memo);
    }

    results.sort((a, b) => b.created.localeCompare(a.created));
    this.memos = results;
  }

  parseMemo(file: TFile, raw: string, fm: Record<string, unknown>, cache?: ReturnType<typeof this.app.metadataCache.getFileCache>): MemoNote {
    // Strip YAML frontmatter using MetadataCache position when available
    let body = raw;
    const fmEnd = cache?.frontmatterPosition?.end;
    if (fmEnd) {
      // frontmatterPosition.end points to the closing '---' line;
      // offset is the character index right after the closing '---\n'
      body = raw.slice(fmEnd.offset).trimStart();
    } else if (raw.startsWith("---")) {
      // Fallback: manual parsing when cache is unavailable
      const end = raw.indexOf("---", 3);
      if (end !== -1) {
        body = raw.slice(end + 3).trimStart();
      }
    }

    // Extract inline #tags from body
    const inlineTags = extractInlineTags(body);

    // Merge frontmatter tags + inline tags
    const fmTags: string[] = [];
    if (Array.isArray(fm["tags"])) {
      for (const t of fm["tags"] as unknown[]) {
        if (typeof t === "string") fmTags.push(t);
      }
    }
    const allTags = Array.from(new Set([...fmTags, ...inlineTags]));

    const created =
      typeof fm["created"] === "string"
        ? fm["created"]
        : file.stat.ctime
        ? new Date(file.stat.ctime).toISOString()
        : new Date().toISOString();

    const dateLabel = created.slice(0, 10);

    return { file, content: body, tags: allTags, created, dateLabel };
  }

  renderToolbar(el: HTMLElement) {
    const left = el.createDiv("memos-toolbar-left");

    const count = this.memos.filter(
      (m) => !this.activeTag || m.tags.includes(this.activeTag)
    ).length;
    left.createSpan({
      cls: "memos-count",
      text: `${count} memo${count !== 1 ? "s" : ""}`,
    });

    if (this.activeTag) {
      const pill = left.createSpan({ cls: "memos-active-filter-pill" });
      pill.setText(`#${this.activeTag}`);
      const x = pill.createSpan({ cls: "memos-filter-clear", text: " ×" });
      x.addEventListener("click", () => {
        this.activeTag = null;
        this.refresh();
      });
    }

    const right = el.createDiv("memos-toolbar-right");

    const captureBtn = right.createDiv({
      cls: "memos-toolbar-btn",
      attr: { "aria-label": "New memo" },
    });
    setIcon(captureBtn, "pencil");
    captureBtn.addEventListener("click", () => {
      new CaptureModal(this.app, this.plugin).open();
    });

    const randomBtn = right.createDiv({
      cls: "memos-toolbar-btn",
      attr: { "aria-label": "Random review" },
    });
    setIcon(randomBtn, "dice");
    randomBtn.addEventListener("click", () => {
      this.handleRandomReview();
    });
  }

  renderCards(el: HTMLElement) {
    const filtered = this.activeTag
      ? this.memos.filter((m) => m.tags.includes(this.activeTag!))
      : this.memos;

    if (filtered.length === 0) {
      const empty = el.createDiv("memos-empty");
      empty.createSpan({ text: "No memos yet. Start capturing your thoughts!" });
      return;
    }

    // Group by date
    const groups = new Map<string, MemoNote[]>();
    for (const memo of filtered) {
      const g = groups.get(memo.dateLabel) ?? [];
      g.push(memo);
      groups.set(memo.dateLabel, g);
    }

    for (const [date, memos] of groups) {
      const group = el.createDiv("memos-date-group");
      group.createDiv({ cls: "memos-date-header", text: date });
      for (const memo of memos) {
        this.renderCard(memo, group);
      }
    }
  }

  renderCard(memo: MemoNote, el: HTMLElement) {
    const card = el.createDiv("memos-card");
    card.dataset["path"] = memo.file.path;

    // Content area — built with safe DOM API (no innerHTML)
    const contentDiv = card.createDiv("memos-card-content");
    this.renderContentDOM(memo.content, contentDiv);

    // Footer
    const footer = card.createDiv("memos-card-footer");

    if (memo.tags.length > 0) {
      const tagsEl = footer.createDiv("memos-card-tags");
      for (const tag of memo.tags) {
        const pill = tagsEl.createSpan({ cls: "memos-tag-pill", text: `#${tag}` });
        pill.addEventListener("click", (e) => {
          e.stopPropagation();
          this.handleTagClick(tag);
        });
      }
    }

    const time = footer.createSpan({ cls: "memos-card-time" });
    const d = new Date(memo.created);
    time.setText(
      `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}`
    );

    // Click card → open file
    card.addEventListener("click", () => {
      this.openMemo(memo.file);
    });
  }

  /** Build card content using safe DOM operations instead of innerHTML. */
  renderContentDOM(content: string, container: HTMLElement) {
    const lines = content.split("\n");
    const re = new RegExp(INLINE_TAG_RE.source, INLINE_TAG_RE.flags);

    for (let i = 0; i < lines.length; i++) {
      if (i > 0) container.createEl("br");

      const line = lines[i];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      re.lastIndex = 0;

      while ((match = re.exec(line)) !== null) {
        // Text before the tag
        if (match.index > lastIndex) {
          container.appendText(line.slice(lastIndex, match.index));
        }
        // Clickable tag span
        const tagName = match[1];
        const tagSpan = container.createSpan({ cls: "memos-inline-tag", text: `#${tagName}` });
        tagSpan.dataset["tag"] = tagName;
        tagSpan.addEventListener("click", (e) => {
          e.stopPropagation();
          this.handleTagClick(tagName);
        });
        lastIndex = re.lastIndex;
      }
      // Remaining text after last tag
      if (lastIndex < line.length) {
        container.appendText(line.slice(lastIndex));
      }
    }
  }

  handleTagClick(tag: string | null) {
    if (tag === null) {
      this.activeTag = null;
    } else {
      this.activeTag = this.activeTag === tag ? null : tag;
    }
    this.refresh();
  }

  handleRandomReview() {
    // Remove previous highlight
    if (this.highlightedCardEl) {
      this.highlightedCardEl.removeClass("memos-card-highlighted");
      this.highlightedCardEl = null;
    }

    const filtered = this.activeTag
      ? this.memos.filter((m) => m.tags.includes(this.activeTag!))
      : this.memos;

    if (filtered.length === 0) return;

    const idx = Math.floor(Math.random() * filtered.length);
    const target = filtered[idx];

    const cardEl = this.contentEl.querySelector(
      `[data-path="${CSS.escape(target.file.path)}"]`
    ) as HTMLElement | null;

    if (cardEl) {
      cardEl.addClass("memos-card-highlighted");
      this.highlightedCardEl = cardEl;
      cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  openMemo(file: TFile) {
    const leaf = this.app.workspace.getLeaf(false);
    leaf.openFile(file);
  }
}

// =============================================================================
// CaptureModal
// =============================================================================

class CaptureModal extends Modal {
  plugin: MemosPlugin;

  constructor(app: App, plugin: MemosPlugin) {
    super(app);
    this.plugin = plugin;
  }

  private viewportHandler: (() => void) | null = null;

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("memos-capture-modal");

    // Textarea fills available space
    const textarea = contentEl.createEl("textarea", {
      cls: "memos-capture-textarea",
      attr: {
        placeholder: "What's on your mind?",
      },
    });

    // Bottom toolbar: tag input + save button on one row, always visible above keyboard
    const bottomBar = contentEl.createDiv("memos-capture-bottom-bar");

    // Tag input row
    const tagRow = bottomBar.createDiv("memos-capture-tag-row");
    tagRow.createSpan({ cls: "memos-capture-tag-label", text: "#" });
    const tagInput = tagRow.createEl("input", {
      cls: "memos-capture-tag-input",
      attr: {
        type: "text",
        placeholder: "tags, separated by spaces or commas",
      },
    });

    // Fixed tag hint
    if (this.plugin.settings.useFixedTag && this.plugin.settings.fixedTag) {
      const hint = bottomBar.createDiv({ cls: "memos-capture-hint" });
      hint.setText(`Fixed tag: #${this.plugin.settings.fixedTag.replace(/^#+/, "")}`);
    }

    // Save button
    const saveBtn = bottomBar.createEl("button", {
      cls: "memos-capture-save-btn mod-cta",
      text: "Save",
    });

    saveBtn.addEventListener("click", () => {
      this.handleSave(textarea.value, tagInput.value);
    });

    // Keyboard shortcut
    contentEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.handleSave(textarea.value, tagInput.value);
      }
    });

    // Mobile keyboard handling: position modal directly above keyboard
    if (window.visualViewport) {
      this.viewportHandler = () => {
        const vv = window.visualViewport!;
        const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
        const modalEl = contentEl.closest(".modal") as HTMLElement | null;
        if (modalEl) {
          if (keyboardHeight > 100) {
            // Push modal above keyboard
            modalEl.style.bottom = `${keyboardHeight}px`;
            modalEl.style.top = "auto";
            modalEl.style.maxHeight = `${vv.height - vv.offsetTop}px`;
          } else {
            modalEl.style.bottom = "";
            modalEl.style.top = "";
            modalEl.style.maxHeight = "";
          }
        }
      };
      window.visualViewport.addEventListener("resize", this.viewportHandler);
      window.visualViewport.addEventListener("scroll", this.viewportHandler);
    }

    // Auto-focus
    setTimeout(() => textarea.focus(), 50);
  }

  async handleSave(content: string, tagInputValue: string) {
    const trimmed = content.trim();
    if (!trimmed) {
      new Notice("Memo cannot be empty.");
      return;
    }

    // Parse tags from tag input field
    const explicitTags = this.parseTags(tagInputValue);

    // Also extract inline #tags from content
    const inlineTags = extractInlineTags(trimmed);

    const allTags = Array.from(new Set([...explicitTags, ...inlineTags]));

    try {
      await this.plugin.saveMemo(trimmed, allTags);
      new Notice("Memo saved!");
      this.close();
    } catch (err) {
      new Notice(`Failed to save memo: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  parseTags(input: string): string[] {
    return input
      .split(/[\s,，]+/)
      .map((t) => t.replace(/^#+/, "").trim())
      .filter((t) => t.length > 0);
  }

  onClose() {
    if (this.viewportHandler && window.visualViewport) {
      window.visualViewport.removeEventListener("resize", this.viewportHandler);
      window.visualViewport.removeEventListener("scroll", this.viewportHandler);
      this.viewportHandler = null;
    }
    this.contentEl.empty();
  }
}

// =============================================================================
// MemosSettingTab
// =============================================================================

class MemosSettingTab extends PluginSettingTab {
  plugin: MemosPlugin;

  constructor(app: App, plugin: MemosPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl).setName("Memos Settings").setHeading();

    new Setting(containerEl)
      .setName("Save folder")
      .setDesc("Folder where new memos are saved (relative to vault root).")
      .addText((text) =>
        text
          .setPlaceholder("00-Inbox")
          .setValue(this.plugin.settings.saveFolder)
          .onChange(async (value) => {
            this.plugin.settings.saveFolder = value.trim() || "00-Inbox";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Use fixed tag")
      .setDesc("Automatically add a tag to every memo you capture.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useFixedTag)
          .onChange(async (value) => {
            this.plugin.settings.useFixedTag = value;
            await this.plugin.saveSettings();
            this.display(); // re-render to show/hide tag input
          })
      );

    if (this.plugin.settings.useFixedTag) {
      new Setting(containerEl)
        .setName("Fixed tag value")
        .setDesc("This tag will be added to every memo (without #).")
        .addText((text) =>
          text
            .setPlaceholder("memo")
            .setValue(this.plugin.settings.fixedTag)
            .onChange(async (value) => {
              this.plugin.settings.fixedTag = value.trim().replace(/^#+/, "");
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Quick capture entry note")
      .setDesc(
        "Path to the entry note that triggers the capture modal when opened. " +
        "Use with the iOS widget's \"Open a specific note\" feature."
      )
      .addText((text) =>
        text
          .setPlaceholder("Quick Capture.md")
          .setValue(this.plugin.settings.captureNotePath)
          .onChange(async (value) => {
            this.plugin.settings.captureNotePath = value.trim() || "Quick Capture.md";
            await this.plugin.saveSettings();
          })
      );
  }
}
