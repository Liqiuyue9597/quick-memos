import { ItemView, WorkspaceLeaf, Notice, setIcon, FuzzySuggestModal, TFile, App } from "obsidian";

import { VIEW_TYPE_CAPTURE } from "./constants";
import { extractInlineTags, parseTags } from "./utils";
import type MemosPlugin from "./plugin";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg"];

/** Modal that lets the user pick an image file from the vault. */
export class ImageSuggestModal extends FuzzySuggestModal<TFile> {
  private onChoose: (file: TFile) => void;

  constructor(app: App, onChoose: (file: TFile) => void) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("搜索图片文件…");
  }

  getItems(): TFile[] {
    return this.app.vault.getFiles().filter((f) =>
      IMAGE_EXTENSIONS.includes(f.extension.toLowerCase())
    );
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file);
  }
}

export class CaptureItemView extends ItemView {
  plugin: MemosPlugin;
  private textarea!: HTMLTextAreaElement;
  /** Explicit tags added via the pill UI (without leading #). */
  private tags: string[] = [];
  /** Container element for tag pills. */
  private tagsContainer!: HTMLDivElement;

  constructor(leaf: WorkspaceLeaf, plugin: MemosPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CAPTURE;
  }

  getDisplayText(): string {
    return "Quick Capture";
  }

  getIcon(): string {
    return "pencil";
  }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.addClass("memos-capture-card-container");

    // ── Close button (top-left floating circle) ──
    const closeBtn = container.createEl("button", {
      cls: "memos-capture-close clickable-icon",
      attr: { "aria-label": "返回" },
    });
    setIcon(closeBtn, "arrow-left");
    closeBtn.addEventListener("click", async () => {
      await this.plugin.activateView();
      this.leaf.detach();
    });

    // ── Card ──
    const card = container.createDiv("memos-capture-card");

    // ── Textarea wrap ──
    const textareaWrap = card.createDiv("memos-capture-card-textarea-wrap");
    this.textarea = textareaWrap.createEl("textarea", {
      cls: "memos-capture-card-textarea",
      attr: { placeholder: "What's on your mind?" },
    });

    // ── Tags area ──
    this.tags = [];
    this.tagsContainer = card.createDiv("memos-capture-card-tags");
    this.renderTags();

    // ── Divider ──
    card.createDiv("memos-capture-card-divider");

    // ── Footer ──
    const footer = card.createDiv("memos-capture-card-footer");
    const footerLeft = footer.createDiv("memos-capture-card-footer-left");
    const footerRight = footer.createDiv("memos-capture-card-footer-right");

    // Image button
    const imageBtn = footerLeft.createEl("button", {
      cls: "memos-capture-card-foot-btn clickable-icon",
      attr: { "aria-label": "插入图片" },
    });
    setIcon(imageBtn, "image");
    imageBtn.addEventListener("click", () => {
      new ImageSuggestModal(this.app, (file) => {
        this.insertAtCursor(`![[${file.name}]]`);
      }).open();
    });

    // Tag shortcut button (focuses the add-tag input)
    const tagBtn = footerLeft.createEl("button", {
      cls: "memos-capture-card-foot-btn clickable-icon",
      attr: { "aria-label": "添加标签" },
    });
    setIcon(tagBtn, "hash");
    tagBtn.addEventListener("click", () => {
      this.showTagInput();
    });

    // Fixed tag hint
    if (this.plugin.settings.useFixedTag && this.plugin.settings.fixedTag) {
      footerLeft.createSpan({
        cls: "memos-capture-card-hint",
        text: `固定标签: #${this.plugin.settings.fixedTag.replace(/^#+/, "")}`,
      });
    }

    // Save button
    const saveBtn = footerRight.createEl("button", {
      cls: "memos-capture-card-save",
      text: "保存 Memo",
    });
    saveBtn.addEventListener("click", () => {
      this.handleSave();
    });

    // ── Keyboard shortcut: Ctrl/Cmd + Enter to save ──
    container.addEventListener("keydown", (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.handleSave();
      }
    });

    // Focus textarea after layout settles
    setTimeout(() => this.textarea.focus(), 100);
  }

  async onClose() {
    this.contentEl.empty();
  }

  // ── Tag pill UI ──────────────────────────────────────────

  /** Re-render the tags container: existing pills + the add button. */
  private renderTags() {
    this.tagsContainer.empty();

    for (const tag of this.tags) {
      const pill = this.tagsContainer.createDiv("memos-capture-card-tag");
      pill.createSpan({ text: `#${tag}` });
      const removeBtn = pill.createSpan({
        cls: "memos-capture-card-tag-remove",
        text: "×",
      });
      removeBtn.addEventListener("click", () => {
        this.tags = this.tags.filter((t) => t !== tag);
        this.renderTags();
      });
    }

    // "+ 添加标签" button
    const addBtn = this.tagsContainer.createDiv("memos-capture-card-tag-add");
    addBtn.setText("+ 添加标签");
    addBtn.addEventListener("click", () => {
      this.showTagInput(addBtn);
    });
  }

  /** Replace the add-button with an inline input for entering a new tag. */
  private showTagInput(replaceEl?: HTMLElement) {
    // If no element provided, find the add button inside tagsContainer
    const target =
      replaceEl ??
      this.tagsContainer.querySelector<HTMLElement>(
        ".memos-capture-card-tag-add"
      );
    if (!target) return;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "memos-capture-card-tag-input";
    input.placeholder = "标签名…";
    target.replaceWith(input);
    input.focus();

    const commit = () => {
      const values = parseTags(input.value);
      for (const v of values) {
        if (!this.tags.includes(v)) {
          this.tags.push(v);
        }
      }
      this.renderTags();
    };

    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === ",") {
        e.preventDefault();
        commit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this.renderTags();
      }
    });

    input.addEventListener("blur", () => {
      commit();
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  /** Insert text at the current cursor position in the textarea. */
  private insertAtCursor(text: string) {
    const ta = this.textarea;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    ta.value = before + text + after;
    const newPos = start + text.length;
    ta.selectionStart = newPos;
    ta.selectionEnd = newPos;
    ta.focus();
  }

  private async handleSave() {
    const trimmed = this.textarea.value.trim();
    if (!trimmed) {
      new Notice("Memo cannot be empty.");
      return;
    }

    const explicitTags = [...this.tags];
    const inlineTags = extractInlineTags(trimmed);
    const allTags = Array.from(new Set([...explicitTags, ...inlineTags]));

    try {
      await this.plugin.saveMemo(trimmed, allTags);
      new Notice("Memo saved!");
      await this.plugin.activateView();
      this.leaf.detach();
    } catch (err) {
      new Notice(
        `Failed to save memo: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
