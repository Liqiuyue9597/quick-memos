import { App, Modal, Notice } from "obsidian";
import { toPng } from "html-to-image";

import { MemoNote } from "./types";
import { INLINE_TAG_RE } from "./constants";
import type MemosPlugin from "./plugin";

/** Render memo content into a container using plain DOM (no Obsidian API). */
function renderExportContent(content: string, container: HTMLElement) {
  const lines = content.split("\n");
  const re = new RegExp(INLINE_TAG_RE.source, INLINE_TAG_RE.flags);

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) container.appendChild(document.createElement("br"));

    const line = lines[i];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    re.lastIndex = 0;

    while ((match = re.exec(line)) !== null) {
      if (match.index > lastIndex) {
        container.appendChild(
          document.createTextNode(line.slice(lastIndex, match.index))
        );
      }
      const tagSpan = document.createElement("span");
      tagSpan.className = "memos-export-inline-tag";
      tagSpan.textContent = `#${match[1]}`;
      container.appendChild(tagSpan);
      lastIndex = re.lastIndex;
    }

    if (lastIndex < line.length) {
      container.appendChild(
        document.createTextNode(line.slice(lastIndex))
      );
    }
  }
}

/**
 * Build a standalone export card DOM element for image generation.
 * This is NOT a screenshot of the in-view card — it is a purpose-built
 * element with its own styling for export.
 */
export function buildExportCard(
  memo: MemoNote,
  options: { authorName?: string; isDarkMode: boolean }
): HTMLDivElement {
  const card = document.createElement("div");
  card.className = "memos-export-card";
  if (options.isDarkMode) card.classList.add("memos-export-dark");

  // Content
  const contentDiv = document.createElement("div");
  contentDiv.className = "memos-export-content";
  renderExportContent(memo.content, contentDiv);
  card.appendChild(contentDiv);

  // Meta section
  const meta = document.createElement("div");
  meta.className = "memos-export-meta";

  // Footer (time + optional author)
  const footer = document.createElement("div");
  footer.className = "memos-export-footer";

  const d = new Date(memo.created);
  const timeSpan = document.createElement("span");
  timeSpan.className = "memos-export-time";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  timeSpan.textContent = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  footer.appendChild(timeSpan);

  if (options.authorName) {
    const authorSpan = document.createElement("span");
    authorSpan.className = "memos-export-author";
    authorSpan.textContent = `\u2014 ${options.authorName}`;
    footer.appendChild(authorSpan);
  }

  meta.appendChild(footer);
  card.appendChild(meta);

  return card;
}

/** Convert a DOM element to a PNG Blob using html-to-image. */
async function generateImage(cardEl: HTMLElement): Promise<Blob> {
  // Temporarily attach to document body (off-screen) for rendering
  cardEl.style.position = "fixed";
  cardEl.style.left = "-9999px";
  cardEl.style.top = "0";
  document.body.appendChild(cardEl);

  try {
    const dataUrl = await toPng(cardEl, {
      pixelRatio: 2, // 2x for retina/sharp output
      quality: 1.0,
    });

    // Convert data URL to Blob
    const res = await fetch(dataUrl);
    return await res.blob();
  } finally {
    document.body.removeChild(cardEl);
  }
}

/** Modal showing the export card preview with Save / Copy buttons. */
export class ExportModal extends Modal {
  plugin: MemosPlugin;
  memo: MemoNote;

  constructor(app: App, plugin: MemosPlugin, memo: MemoNote) {
    super(app);
    this.plugin = plugin;
    this.memo = memo;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.addClass("memos-export-modal");

    // Determine dark mode
    const isDarkMode = document.body.classList.contains("theme-dark");

    // Build the export card preview
    const authorName = this.plugin.settings.showAuthorInExport
      ? this.plugin.settings.authorName
      : undefined;
    const cardEl = buildExportCard(this.memo, { authorName, isDarkMode });

    // Preview section
    const previewContainer = contentEl.createDiv("memos-export-preview");
    previewContainer.appendChild(cardEl);

    // Action buttons
    const btnRow = contentEl.createDiv("memos-export-btn-row");

    const saveBtn = btnRow.createEl("button", {
      cls: "memos-export-btn mod-cta",
      text: "Save as PNG",
    });
    saveBtn.addEventListener("click", () => this.handleSave(isDarkMode));

    const copyBtn = btnRow.createEl("button", {
      cls: "memos-export-btn",
      text: "Copy to clipboard",
    });
    copyBtn.addEventListener("click", () => this.handleCopy(isDarkMode));
  }

  async handleSave(isDarkMode: boolean) {
    try {
      const authorName = this.plugin.settings.showAuthorInExport
        ? this.plugin.settings.authorName
        : undefined;
      const cardEl = buildExportCard(this.memo, { authorName, isDarkMode });
      const blob = await generateImage(cardEl);

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const d = new Date(this.memo.created);
      const fname = `memo-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}.png`;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      new Notice("Image saved!");
      this.close();
    } catch (err) {
      new Notice(
        `Export failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  async handleCopy(isDarkMode: boolean) {
    try {
      const authorName = this.plugin.settings.showAuthorInExport
        ? this.plugin.settings.authorName
        : undefined;
      const cardEl = buildExportCard(this.memo, { authorName, isDarkMode });
      const blob = await generateImage(cardEl);

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      new Notice("Image copied to clipboard!");
      this.close();
    } catch (err) {
      new Notice(
        `Copy failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}
