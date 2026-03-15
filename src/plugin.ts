import {
  Notice,
  Plugin,
  TFile,
  normalizePath,
} from "obsidian";

import { VIEW_TYPE_MEMOS, VIEW_TYPE_CAPTURE } from "./constants";
import { MemosSettings, DEFAULT_SETTINGS } from "./types";
import { MemosView } from "./view";
import { CaptureItemView } from "./capture-view";
import { MemosSettingTab } from "./settings";

export default class MemosPlugin extends Plugin {
  settings!: MemosSettings;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_MEMOS, (leaf) => new MemosView(leaf, this));
    this.registerView(VIEW_TYPE_CAPTURE, (leaf) => new CaptureItemView(leaf, this));

    // Ribbon icon → open Memos view (fullscreen on mobile)
    this.addRibbonIcon("sticky-note", "Open Memos view", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-memos-capture",
      name: "Quick capture",
      callback: () => {
        this.activateCaptureView();
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
          this.activateCaptureView();
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
