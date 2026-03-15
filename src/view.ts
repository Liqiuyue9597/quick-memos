import {
  ItemView,
  TFile,
  TFolder,
  WorkspaceLeaf,
  normalizePath,
  setIcon,
} from "obsidian";

import { VIEW_TYPE_MEMOS, INLINE_TAG_RE } from "./constants";
import { MemoNote } from "./types";
import { extractInlineTags } from "./utils";
import { parseMemoContent } from "./memo-parser";
import { computeStats, renderStatsSection } from "./stats";
import type MemosPlugin from "./plugin";
import { ExportModal } from "./export-image";

export class MemosView extends ItemView {
  plugin: MemosPlugin;
  activeTag: string | null = null;
  activeDateFilter: string | null = null;
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

    // Stats section (heatmap + numbers) — always shows global data
    const statsContainer = this.contentEl.createDiv();
    const stats = computeStats(this.memos);
    renderStatsSection(statsContainer, stats, this.plugin.settings.statsCollapsed, {
      onToggle: () => this.handleStatsToggle(),
      onDateClick: (date) => this.handleDateFilter(date),
    });

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

  parseMemo(
    file: TFile,
    raw: string,
    fm: Record<string, unknown>,
    cache?: ReturnType<typeof this.app.metadataCache.getFileCache>
  ): MemoNote {
    const fmEndOffset = cache?.frontmatterPosition?.end?.offset;
    const { body, tags } = parseMemoContent(raw, fm, fmEndOffset);

    const created =
      typeof fm["created"] === "string"
        ? fm["created"]
        : file.stat.ctime
        ? new Date(file.stat.ctime).toISOString()
        : new Date().toISOString();

    const dateLabel = created.slice(0, 10);

    return { file, content: body, tags, created, dateLabel };
  }

  renderToolbar(el: HTMLElement) {
    const left = el.createDiv("memos-toolbar-left");

    const count = this.memos.filter(
      (m) =>
        (!this.activeTag || m.tags.includes(this.activeTag)) &&
        (!this.activeDateFilter || m.dateLabel === this.activeDateFilter)
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

    if (this.activeDateFilter) {
      const pill = left.createSpan({ cls: "memos-active-filter-pill memos-date-filter-pill" });
      pill.setText(this.activeDateFilter);
      const x = pill.createSpan({ cls: "memos-filter-clear", text: " ×" });
      x.addEventListener("click", () => {
        this.activeDateFilter = null;
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
      this.plugin.activateCaptureView();
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
    let filtered = this.memos;
    if (this.activeTag) {
      filtered = filtered.filter((m) => m.tags.includes(this.activeTag!));
    }
    if (this.activeDateFilter) {
      filtered = filtered.filter((m) => m.dateLabel === this.activeDateFilter);
    }

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

    // Right side of footer: time + share button
    const footerRight = footer.createDiv("memos-card-footer-right");

    const time = footerRight.createSpan({ cls: "memos-card-time" });
    const d = new Date(memo.created);
    time.setText(
      `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}`
    );

    const shareBtn = footerRight.createDiv({
      cls: "memos-card-share-btn",
      attr: { "aria-label": "Export as image" },
    });
    setIcon(shareBtn, "share");
    shareBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      new ExportModal(this.app, this.plugin, memo).open();
    });

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

  handleDateFilter(date: string) {
    this.activeDateFilter = this.activeDateFilter === date ? null : date;
    this.refresh();
  }

  handleStatsToggle() {
    this.plugin.settings.statsCollapsed = !this.plugin.settings.statsCollapsed;
    this.plugin.saveSettings();
    this.refresh();
  }

  openMemo(file: TFile) {
    const leaf = this.app.workspace.getLeaf(false);
    leaf.openFile(file);
  }
}
