import {
  Notice,
  Platform,
  Plugin,
  TFile,
  normalizePath,
} from "obsidian";

import { VIEW_TYPE_MEMOS, VIEW_TYPE_CAPTURE } from "./constants";
import { MemosSettings, DEFAULT_SETTINGS } from "./types";
import { MemosView } from "./view";
import { CaptureItemView } from "./capture-view";
import { MemosSettingTab } from "./settings";
import { extractInlineTags } from "./utils";
import { i18n, t } from "./i18n";

export default class MemosPlugin extends Plugin {
  settings!: MemosSettings;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_MEMOS, (leaf) => new MemosView(leaf, this));
    this.registerView(VIEW_TYPE_CAPTURE, (leaf) => new CaptureItemView(leaf, this));

    // Ribbon icon → open Memos view (fullscreen on mobile)
    this.addRibbonIcon("sticky-note", i18n.openMemosView, () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-memos-capture",
      name: i18n.quickCapture,
      callback: () => {
        this.activateCaptureView();
      },
    });

    this.addCommand({
      id: "open-memos-view",
      name: i18n.openMemosView,
      callback: () => {
        this.activateView();
      },
    });

    this.addCommand({
      id: "create-capture-note",
      name: i18n.createCaptureNote,
      callback: async () => {
        const path = this.settings.captureNotePath;
        if (this.app.vault.getAbstractFileByPath(path)) {
          new Notice(t("entryNoteExists", { path }));
          return;
        }
        const content = i18n.entryNoteContent;
        await this.app.vault.create(path, content);
        new Notice(t("createdEntryNote", { path }));
      },
    });

    // Listen for file-open events → auto-trigger Capture view for the entry note
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file && file.path === normalizePath(this.settings.captureNotePath)) {
          this.activateCaptureView();
        }
      })
    );

    this.addSettingTab(new MemosSettingTab(this.app, this));

    // ── URI handler: obsidian://memo?content=...&tags=... ──
    this.registerObsidianProtocolHandler("memo", async (params) => {
      const content = (params.content || params.text || "").trim();
      const tags = (params.tags || "")
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);
      const mood = (params.mood || "").trim();
      const source = (params.source || "").trim();

      if (!content) {
        new Notice(i18n.memoContentEmpty);
        return;
      }

      const meta: { mood?: string; source?: string } = {};
      if (mood) meta.mood = mood;
      if (source) meta.source = source;

      await this.saveMemo(content, tags, Object.keys(meta).length > 0 ? meta : undefined);
      new Notice(i18n.memoSaved);
    });

    // ── Right-click menu: Save selection as Memo ──
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        const selection = editor.getSelection();
        if (!selection) return;

        menu.addItem((item) => {
          item
            .setTitle(i18n.saveAsMemo)
            .setIcon("sticky-note")
            .onClick(async () => {
              const tags = extractInlineTags(selection);
              await this.saveMemo(selection, tags);
              new Notice(i18n.selectionSavedAsMemo);
            });
        });
      })
    );

    // ── Transclusion: style ![[memo]] embeds as cards ──
    // Uses CSS attribute selector [src^="memo-"] for instant, reliable styling.
    // Additionally, a PostProcessor adds a class for memos not following the
    // naming convention (detected via frontmatter type: memo).
    this.registerMarkdownPostProcessor((el) => {
      // Handle already-rendered embeds
      const embeds = el.querySelectorAll<HTMLElement>('.internal-embed:not([class*="memos-transclusion"])');
      this.tagMemoEmbeds(embeds);

      // Handle lazily-rendered embeds via MutationObserver
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
              const added = node.matches?.(".internal-embed")
                ? [node]
                : Array.from(node.querySelectorAll?.(".internal-embed") ?? []);
              if (added.length > 0) this.tagMemoEmbeds(added as Iterable<HTMLElement>);
            }
          }
        }
      });
      observer.observe(el, { childList: true, subtree: true });

      // Disconnect after 5s to avoid leaks (embeds should be resolved by then)
      setTimeout(() => observer.disconnect(), 5000);
    });

    this.app.workspace.onLayoutReady(() => {
      if (Platform.isMobile) {
        this.activateView();
      }
    });
  }

  onunload() {
    // Intentionally empty — do NOT detach leaves here.
    // Obsidian restores views in their original positions on plugin reload/update.
  }

  async activateCaptureView() {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE_CAPTURE, active: true });
    this.app.workspace.revealLeaf(leaf);
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

  async saveMemo(content: string, tags: string[], meta?: { mood?: string; source?: string }): Promise<string> {
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

    // Build optional extended fields (mood, source, status)
    let extraYaml = "";
    if (meta?.mood) extraYaml += `mood: "${meta.mood}"\n`;
    if (meta?.source) extraYaml += `source: "${meta.source}"\n`;
    extraYaml += "status: active\n";

    const frontmatter = `---\ncreated: ${iso}\ntype: memo\n${tagYaml}\n${extraYaml}---\n\n`;
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

    return filename;
  }

  /** Tag embed elements whose source file has type: memo in frontmatter. */
  private tagMemoEmbeds(embeds: Iterable<HTMLElement>) {
    for (const embed of embeds) {
      if (embed.hasClass("memos-transclusion-card")) continue;
      const src = embed.getAttribute("src");
      if (!src) continue;

      const file = this.app.metadataCache.getFirstLinkpathDest(src, "");
      if (!file) continue;

      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter || cache.frontmatter["type"] !== "memo") continue;

      embed.addClass("memos-transclusion-card");
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
