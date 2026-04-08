import { ItemView, WorkspaceLeaf, Notice, setIcon, FuzzySuggestModal, TFile, App } from "obsidian";

import { VIEW_TYPE_CAPTURE } from "./constants";
import { extractInlineTags, parseTags } from "./utils";
import { loadTagSuggestions } from "./tag-suggestions";
import { saveImageAttachment } from "./image-attachment";
import type MemosPlugin from "./plugin";
import { i18n, t } from "./i18n";

/** Modal that lets the user pick a note to insert as [[wikilink]]. */
export class NoteSuggestModal extends FuzzySuggestModal<TFile> {
  private onChoose: (file: TFile) => void;
  private onDismiss: (() => void) | undefined;

  constructor(app: App, onChoose: (file: TFile) => void, onDismiss?: () => void) {
    super(app);
    this.onChoose = onChoose;
    this.onDismiss = onDismiss;
    this.setPlaceholder(i18n.searchNotes);
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  getItemText(file: TFile): string {
    return file.basename;
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file);
  }

  onClose(): void {
    // Called when modal is dismissed (Escape or click outside) without choosing
    // We use a short delay so onChooseItem fires first if the user made a selection
    setTimeout(() => {
      this.onDismiss?.();
    }, 50);
  }
}

export class CaptureItemView extends ItemView {
  plugin: MemosPlugin;
  private textarea!: HTMLTextAreaElement;
  /** Explicit tags added via the pill UI (without leading #). */
  private tags: string[] = [];
  /** Container element for tag pills. */
  private tagsContainer!: HTMLDivElement;
  /** Selected mood (emoji string or empty). */
  private selectedMood = "";
  /** Selected source (string or empty). */
  private selectedSource = "";
  /** Hidden file picker used to choose an image on mobile and desktop. */
  private imageInput!: HTMLInputElement;
  /** Suggested tags shown above the add button. */
  private suggestedTags: string[] = [];
  /** Invalidates async suggestion loads when the view closes/reopens. */
  private tagSuggestionLoadToken = 0;
  /** Prevents multiple wikilink modals from opening simultaneously. */
  private wikilinkModalOpen = false;

  constructor(leaf: WorkspaceLeaf, plugin: MemosPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CAPTURE;
  }

  getDisplayText(): string {
    return i18n.quickCaptureTitle;
  }

  getIcon(): string {
    return "pencil";
  }

  async onOpen() {
    await Promise.resolve();
    const container = this.contentEl;
    container.empty();
    container.addClass("memos-capture-card-container");

    // ── Close button (top-left floating circle) ──
    const closeBtn = container.createEl("button", {
      cls: "memos-capture-close clickable-icon",
      attr: { "aria-label": i18n.back },
    });
    setIcon(closeBtn, "arrow-left");
    closeBtn.addEventListener("click", () => {
      void this.plugin.activateView().then(() => {
        this.leaf.detach();
      });
    });

    // ── Card ──
    const card = container.createDiv("memos-capture-card");

    // ── Textarea wrap ──
    const textareaWrap = card.createDiv("memos-capture-card-textarea-wrap");
    this.textarea = textareaWrap.createEl("textarea", {
      cls: "memos-capture-card-textarea",
      attr: { placeholder: i18n.whatsOnYourMind },
    });

    // ── [[ wikilink trigger: detect "[[" input and open note suggest modal ──
    this.textarea.addEventListener("input", () => {
      this.handleWikilinkTrigger();
    });

    // ── Tags area ──
    this.tags = [];
    this.suggestedTags = [];
    this.tagsContainer = card.createDiv("memos-capture-card-tags");
    this.renderTags();
    void this.refreshTagSuggestions();

    // ── Mood picker (optional) ──
    if (this.plugin.settings.enableMood) {
      const moodRow = card.createDiv("memos-capture-meta-row");
      moodRow.createSpan({ cls: "memos-capture-meta-label", text: i18n.mood });
      const moodPills = moodRow.createDiv("memos-capture-meta-pills");
      for (const emoji of this.plugin.settings.moodOptions) {
        const pill = moodPills.createSpan({ cls: "memos-capture-meta-pill", text: emoji });
        pill.addEventListener("click", () => {
          this.selectedMood = this.selectedMood === emoji ? "" : emoji;
          moodPills.querySelectorAll(".memos-capture-meta-pill").forEach((el) => {
            el.removeClass("is-active");
          });
          if (this.selectedMood) pill.addClass("is-active");
        });
      }
    }

    // ── Source picker (optional) ──
    if (this.plugin.settings.enableSource) {
      const sourceRow = card.createDiv("memos-capture-meta-row");
      sourceRow.createSpan({ cls: "memos-capture-meta-label", text: i18n.source });
      const sourcePills = sourceRow.createDiv("memos-capture-meta-pills");
      for (const src of this.plugin.settings.sourceOptions) {
        const pill = sourcePills.createSpan({ cls: "memos-capture-meta-pill", text: src });
        pill.addEventListener("click", () => {
          this.selectedSource = this.selectedSource === src ? "" : src;
          sourcePills.querySelectorAll(".memos-capture-meta-pill").forEach((el) => {
            el.removeClass("is-active");
          });
          if (this.selectedSource) pill.addClass("is-active");
        });
      }
    }

    // ── Divider ──
    card.createDiv("memos-capture-card-divider");

    // ── Footer ──
    const footer = card.createDiv("memos-capture-card-footer");
    const footerLeft = footer.createDiv("memos-capture-card-footer-left");
    const footerRight = footer.createDiv("memos-capture-card-footer-right");

    // Image button
    const imageBtn = footerLeft.createEl("button", {
      cls: "memos-capture-card-foot-btn clickable-icon",
      attr: { "aria-label": i18n.insertImage },
    });
    setIcon(imageBtn, "image");
    this.imageInput = document.createElement("input");
    this.imageInput.type = "file";
    this.imageInput.accept = "image/*";
    this.imageInput.multiple = false;
    this.imageInput.addClass("memos-hidden");
    this.registerDomEvent(this.imageInput, "change", () => {
      void this.handleImageSelection();
    });
    container.appendChild(this.imageInput);
    imageBtn.addEventListener("click", () => {
      this.imageInput.value = "";
      this.imageInput.click();
    });

    // Tag shortcut button (focuses the add-tag input)
    const tagBtn = footerLeft.createEl("button", {
      cls: "memos-capture-card-foot-btn clickable-icon",
      attr: { "aria-label": i18n.addTag },
    });
    setIcon(tagBtn, "hash");
    tagBtn.addEventListener("click", () => {
      this.showTagInput();
    });

    // Fixed tag hint
    if (this.plugin.settings.useFixedTag && this.plugin.settings.fixedTag) {
      footerLeft.createSpan({
        cls: "memos-capture-card-hint",
        text: t("fixedTagHint", { tag: this.plugin.settings.fixedTag.replace(/^#+/, "") }),
      });
    }

    // Save button
    const saveBtn = footerRight.createEl("button", {
      cls: "memos-capture-card-save",
      text: i18n.saveMemo,
    });
    saveBtn.addEventListener("click", () => {
      void this.handleSave();
    });

    // ── Keyboard shortcut: Ctrl/Cmd + Enter to save ──
    container.addEventListener("keydown", (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void this.handleSave();
      }
    });

    // Focus textarea after layout settles
    setTimeout(() => this.textarea.focus(), 100);
  }

  async onClose() {
    await Promise.resolve();
    this.tagSuggestionLoadToken += 1;
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

    const visibleSuggestions = this.suggestedTags.filter((tag) => !this.tags.includes(tag));
    for (const tag of visibleSuggestions) {
      const pill = this.tagsContainer.createDiv(
        "memos-capture-card-tag memos-capture-card-tag-suggestion"
      );
      pill.createSpan({ text: `#${tag}` });
      pill.addEventListener("click", () => {
        if (this.tags.includes(tag)) return;
        this.tags.push(tag);
        this.renderTags();
      });
    }

    // "+ Add tag" button
    const addBtn = this.tagsContainer.createDiv("memos-capture-card-tag-add");
    addBtn.setText(i18n.addTagButton);
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
    input.placeholder = i18n.tagPlaceholder;
    target.replaceWith(input);
    input.focus();

    // Track IME composition state (Chinese/Japanese/Korean input)
    let composing = false;
    input.addEventListener("compositionstart", () => { composing = true; });
    input.addEventListener("compositionend", () => { composing = false; });

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
      // Ignore keydown events while IME is composing (e.g. selecting Chinese characters)
      if (composing) return;

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

  /** Load tag suggestions from the memo folder and refresh the chip row. */
  private async refreshTagSuggestions() {
    const loadToken = ++this.tagSuggestionLoadToken;
    const excludedTags =
      this.plugin.settings.useFixedTag && this.plugin.settings.fixedTag
        ? [this.plugin.settings.fixedTag]
        : [];

    try {
      const suggestions = await loadTagSuggestions(
        this.app,
        this.plugin.settings.saveFolder,
        {
          limit: 4,
          excludedTags,
        }
      );

      if (loadToken !== this.tagSuggestionLoadToken) return;
      this.suggestedTags = suggestions;
      this.renderTags();
    } catch {
      // Suggestions are best-effort; the capture flow should still work even if
      // the vault scan fails for some reason.
    }
  }

  /** Save the selected image into the attachment location and insert an embed. */
  private async handleImageSelection() {
    const selected = this.imageInput.files?.[0];
    if (!selected) return;

    try {
      const attachmentPath = await saveImageAttachment(this.app, selected, this.plugin.settings.saveFolder);
      this.insertAtCursor(`![[${attachmentPath}]]`);
    } catch (err) {
      new Notice(
        t("failedToSave", { err: err instanceof Error ? err.message : String(err) })
      );
    } finally {
      this.imageInput.value = "";
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  /**
   * Detect "[[" typed in the textarea and open note suggest modal.
   * On selection: replaces the "[[" with "[[NoteName]]".
   * On dismiss: leaves the "[[" as-is so the user can type manually.
   */
  private handleWikilinkTrigger() {
    if (this.wikilinkModalOpen) return;

    const ta = this.textarea;
    const cursor = ta.selectionStart;
    const textBefore = ta.value.slice(0, cursor);

    // Check if the last two characters are "[["
    if (!textBefore.endsWith("[[")) return;

    this.wikilinkModalOpen = true;

    // Position where "[[" starts
    const bracketStart = cursor - 2;
    let chosen = false;

    new NoteSuggestModal(
      this.app,
      (file) => {
        chosen = true;
        // Replace "[[" with "[[NoteName]]"
        const linkText = `[[${file.basename}]]`;
        const before = ta.value.slice(0, bracketStart);
        const after = ta.value.slice(cursor);
        ta.value = before + linkText + after;
        const newPos = bracketStart + linkText.length;
        ta.selectionStart = newPos;
        ta.selectionEnd = newPos;
        ta.focus();
        this.wikilinkModalOpen = false;
      },
      () => {
        // onDismiss — only fire if user didn't choose a file
        if (!chosen) {
          ta.focus();
          this.wikilinkModalOpen = false;
        }
      }
    ).open();
  }

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
      new Notice(i18n.memoEmpty);
      return;
    }

    const explicitTags = [...this.tags];
    const inlineTags = extractInlineTags(trimmed);
    const allTags = Array.from(new Set([...explicitTags, ...inlineTags]));

    const meta: { mood?: string; source?: string } = {};
    if (this.selectedMood) meta.mood = this.selectedMood;
    if (this.selectedSource) meta.source = this.selectedSource;

    try {
      await this.plugin.saveMemo(trimmed, allTags, Object.keys(meta).length > 0 ? meta : undefined);
      new Notice(i18n.memoSaved);
      await this.plugin.activateView();
      this.leaf.detach();
    } catch (err) {
      new Notice(
        t("failedToSave", { err: err instanceof Error ? err.message : String(err) })
      );
    }
  }
}
