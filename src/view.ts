import {
  ItemView,
  TFile,
  TFolder,
  WorkspaceLeaf,
  normalizePath,
  setIcon,
} from "obsidian";

import { VIEW_TYPE_MEMOS, INLINE_TAG_RE, WIKILINK_RE } from "./constants";
import { MemoNote } from "./types";
import { extractInlineTags } from "./utils";
import { parseMemoContent } from "./memo-parser";
import { computeStats, renderStatsSection } from "./stats";
import type MemosPlugin from "./plugin";
import { ExportModal } from "./export-image";
import { exportToCanvas } from "./canvas-export";
import { i18n } from "./i18n";

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
    return i18n.memosTitle;
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
    // Listen to metadataCache "changed" instead of vault "modify".
    // When a memo file is edited and saved, vault "modify" fires before
    // metadataCache has re-parsed the frontmatter, so refresh() would
    // read stale cache data.  The "changed" event fires only after the
    // cache is up-to-date, ensuring we always render the latest content.
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
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

    // On mobile: stats + cards share a single scroll container so the
    // heatmap scrolls away while the toolbar stays pinned at the top.
    // On desktop: stats stays fixed above the scrollable card list.
    const isMobile = this.contentEl.closest(".is-mobile") !== null;

    if (isMobile) {
      const scrollContainer = this.contentEl.createDiv("memos-cards-container");

      const statsContainer = scrollContainer.createDiv();
      const stats = computeStats(this.memos);
      renderStatsSection(statsContainer, stats, this.plugin.settings.statsCollapsed, {
        onToggle: () => this.handleStatsToggle(),
        onDateClick: (date) => this.handleDateFilter(date),
      });

      this.renderCards(scrollContainer);
    } else {
      const statsContainer = this.contentEl.createDiv();
      const stats = computeStats(this.memos);
      renderStatsSection(statsContainer, stats, this.plugin.settings.statsCollapsed, {
        onToggle: () => this.handleStatsToggle(),
        onDateClick: (date) => this.handleDateFilter(date),
      });

      const cardsContainer = this.contentEl.createDiv("memos-cards-container");
      this.renderCards(cardsContainer);
    }
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

    // Parallel read for better performance with many files
    const results = (
      await Promise.all(
        files.map(async (file) => {
          const cache = this.app.metadataCache.getFileCache(file);
          const fm = cache?.frontmatter;
          if (!fm || fm["type"] !== "memo") return null;

          const raw = await this.app.vault.read(file);
          return this.parseMemo(file, raw, fm, cache);
        })
      )
    ).filter((m): m is MemoNote => m !== null);

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
        : (file.stat.ctime
          ? new Date(file.stat.ctime).toISOString()
          : new Date().toISOString());

    const dateLabel = created.slice(0, 10);

    const mood = typeof fm["mood"] === "string" ? fm["mood"].replace(/^"|"$/g, "") : "";
    const source = typeof fm["source"] === "string" ? fm["source"].replace(/^"|"$/g, "") : "";

    return { file, content: body, tags, created, dateLabel, mood, source };
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
      text: i18n.memoCount(count),
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
      attr: { "aria-label": i18n.newMemo },
    });
    setIcon(captureBtn, "pencil");
    captureBtn.addEventListener("click", () => {
      this.plugin.activateCaptureView();
    });

    const randomBtn = right.createDiv({
      cls: "memos-toolbar-btn",
      attr: { "aria-label": i18n.randomReview },
    });
    setIcon(randomBtn, "dice");
    randomBtn.addEventListener("click", () => {
      this.handleRandomReview();
    });

    const canvasBtn = right.createDiv({
      cls: "memos-toolbar-btn",
      attr: { "aria-label": i18n.sendToCanvas },
    });
    setIcon(canvasBtn, "layout-dashboard");
    canvasBtn.addEventListener("click", () => {
      const filtered = this.getFilteredMemos();
      exportToCanvas(this.app, filtered);
    });
  }

  renderCards(el: HTMLElement) {
    const filtered = this.getFilteredMemos();

    if (filtered.length === 0) {
      const empty = el.createDiv("memos-empty");
      empty.createSpan({ text: i18n.noMemosYet });
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

    // Right side of footer: mood + source + time + share button
    const footerRight = footer.createDiv("memos-card-footer-right");

    if (memo.mood) {
      footerRight.createSpan({ cls: "memos-card-mood", text: memo.mood });
    }

    if (memo.source) {
      footerRight.createSpan({ cls: "memos-card-source", text: memo.source });
    }

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
      attr: { "aria-label": i18n.exportAsImage },
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

  private static readonly IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
  private static readonly EMBED_RE = /!\[\[(.+?)\]\]/g;

  /** Build card content using safe DOM operations instead of innerHTML. */
  renderContentDOM(content: string, container: HTMLElement) {
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (i > 0) container.createEl("br");

      const line = lines[i];
      // Split line into text segments and embed segments
      const embedRe = new RegExp(MemosView.EMBED_RE.source, MemosView.EMBED_RE.flags);
      let lastIdx = 0;
      let embedMatch: RegExpExecArray | null;

      while ((embedMatch = embedRe.exec(line)) !== null) {
        // Render text before the embed (with inline tag support)
        if (embedMatch.index > lastIdx) {
          this.renderTextSegment(line.slice(lastIdx, embedMatch.index), container);
        }
        // Render the embed
        const embedName = embedMatch[1];
        this.renderEmbed(embedName, container);
        lastIdx = embedRe.lastIndex;
      }
      // Remaining text after last embed
      if (lastIdx < line.length) {
        this.renderTextSegment(line.slice(lastIdx), container);
      }
    }
  }

  /** Render a text segment with inline #tag and [[wikilink]] support. */
  private renderTextSegment(text: string, container: HTMLElement) {
    const tagRe = new RegExp(INLINE_TAG_RE.source, INLINE_TAG_RE.flags);
    const linkRe = new RegExp(WIKILINK_RE.source, WIKILINK_RE.flags);

    // Collect all matches and sort by position
    const matches: Array<{
      index: number;
      length: number;
      type: "tag" | "link";
      tagName?: string;
      linkPath?: string;
      linkAlias?: string;
    }> = [];

    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(text)) !== null) {
      matches.push({ index: m.index, length: m[0].length, type: "tag", tagName: m[1] });
    }
    while ((m = linkRe.exec(text)) !== null) {
      matches.push({ index: m.index, length: m[0].length, type: "link", linkPath: m[1], linkAlias: m[2] });
    }
    matches.sort((a, b) => a.index - b.index);

    let lastIndex = 0;
    for (const match of matches) {
      if (match.index < lastIndex) continue; // skip overlapping matches
      if (match.index > lastIndex) {
        container.appendText(text.slice(lastIndex, match.index));
      }
      if (match.type === "tag" && match.tagName) {
        const tagSpan = container.createSpan({ cls: "memos-inline-tag", text: `#${match.tagName}` });
        tagSpan.dataset["tag"] = match.tagName;
        tagSpan.addEventListener("click", (e) => {
          e.stopPropagation();
          this.handleTagClick(match.tagName!);
        });
      } else if (match.type === "link" && match.linkPath) {
        const displayText = match.linkAlias || match.linkPath;
        const linkSpan = container.createSpan({ cls: "memos-wikilink", text: displayText });
        linkSpan.dataset["href"] = match.linkPath;
        linkSpan.addEventListener("click", (e) => {
          e.stopPropagation();
          this.app.workspace.openLinkText(match.linkPath!, "", false);
        });
        linkSpan.addEventListener("mouseover", (e: MouseEvent) => {
          this.app.workspace.trigger("hover-link", {
            event: e,
            source: VIEW_TYPE_MEMOS,
            hoverParent: this,
            targetEl: linkSpan,
            linktext: match.linkPath!,
            sourcePath: "",
          });
        });
      }
      lastIndex = match.index + match.length;
    }
    if (lastIndex < text.length) {
      container.appendText(text.slice(lastIndex));
    }
  }

  /** Render a ![[embed]] — show image if it's an image file, otherwise plain text. */
  private renderEmbed(name: string, container: HTMLElement) {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (!MemosView.IMAGE_EXTENSIONS.includes(ext)) {
      // Non-image embed: render as plain text
      container.appendText(`![[${name}]]`);
      return;
    }

    // Try to find the file in vault
    const file = this.app.metadataCache.getFirstLinkpathDest(name, "");
    if (!file) {
      // File not found: render as plain text
      container.appendText(`![[${name}]]`);
      return;
    }

    const resourcePath = this.app.vault.getResourcePath(file);
    const img = container.createEl("img", {
      cls: "memos-card-image",
      attr: {
        src: resourcePath,
        alt: name,
        loading: "lazy",
      },
    });
    img.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  handleTagClick(tag: string | null) {
    if (tag === null) {
      this.activeTag = null;
    } else {
      this.activeTag = this.activeTag === tag ? null : tag;
    }
    this.refresh();
  }

  /** Return memos filtered by the currently active tag and date filters. */
  getFilteredMemos(): MemoNote[] {
    let filtered = this.memos;
    if (this.activeTag) {
      filtered = filtered.filter((m) => m.tags.includes(this.activeTag!));
    }
    if (this.activeDateFilter) {
      filtered = filtered.filter((m) => m.dateLabel === this.activeDateFilter);
    }
    return filtered;
  }

  handleRandomReview() {
    // Remove previous highlight
    if (this.highlightedCardEl) {
      this.highlightedCardEl.removeClass("memos-card-highlighted");
      this.highlightedCardEl = null;
    }

    const filtered = this.getFilteredMemos();

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
    // Check if the file is already open in a markdown tab
    const existing = this.app.workspace.getLeavesOfType("markdown").find((leaf) => {
      const viewFile = (leaf.view as { file?: TFile }).file;
      return viewFile?.path === file.path;
    });

    if (existing) {
      this.app.workspace.revealLeaf(existing);
    } else {
      const leaf = this.app.workspace.getLeaf("tab");
      leaf.openFile(file);
    }
  }
}
