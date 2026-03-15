import { App, Modal, Notice } from "obsidian";

import { extractInlineTags, parseTags } from "./utils";
import type MemosPlugin from "./plugin";

export class CaptureModal extends Modal {
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

    // Mobile: when keyboard opens, scroll save button into view
    if (document.body.classList.contains("is-mobile") && window.visualViewport) {
      this.viewportHandler = () => {
        const vv = window.visualViewport!;
        const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
        if (keyboardHeight > 100) {
          // Keyboard is open — scroll the save button into the visible area
          saveBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      };
      window.visualViewport.addEventListener("resize", this.viewportHandler);
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
    const explicitTags = parseTags(tagInputValue);

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

  onClose() {
    if (this.viewportHandler && window.visualViewport) {
      window.visualViewport.removeEventListener("resize", this.viewportHandler);
      this.viewportHandler = null;
    }
    this.contentEl.empty();
  }
}
