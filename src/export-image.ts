import { App, Modal, Notice, Platform } from "obsidian";

import { MemoNote } from "./types";
import { i18n, t } from "./i18n";
import { INLINE_TAG_RE } from "./constants";
import type MemosPlugin from "./plugin";

/* ---------------------------------------------------------------------------
   Theme constants for Canvas rendering and DOM preview.
   --------------------------------------------------------------------------- */

interface CardTheme {
  bgGradientStart: string;
  bgGradientEnd: string;
  textColor: string;
  tagColor: string;
  metaBorderColor: string;
  timeColor: string;
  authorColor: string;
  brandingColor: string;
}

const LIGHT_THEME: CardTheme = {
  bgGradientStart: "#ffffff",
  bgGradientEnd: "#f8f9fa",
  textColor: "#1a1a1a",
  tagColor: "#6b7280",
  metaBorderColor: "rgba(0, 0, 0, 0.06)",
  timeColor: "#9ca3af",
  authorColor: "#9ca3af",
  brandingColor: "#c9cdd4",
};

const DARK_THEME: CardTheme = {
  bgGradientStart: "#1e1e1e",
  bgGradientEnd: "#2a2a2a",
  textColor: "#e0e0e0",
  tagColor: "#9ca3af",
  metaBorderColor: "rgba(255, 255, 255, 0.08)",
  timeColor: "#6b7280",
  authorColor: "#6b7280",
  brandingColor: "#4a4a4a",
};

/* ---------------------------------------------------------------------------
   Canvas-based image generation — no DOM serialization, no foreignObject.
   --------------------------------------------------------------------------- */

const CARD_WIDTH = 440;
const PADDING_X = 28;
const PADDING_TOP = 32;
const PADDING_BOTTOM = 24;
const BORDER_RADIUS = 16;
const CONTENT_FONT_SIZE = 16;
const CONTENT_LINE_HEIGHT = 1.8;
const META_FONT_SIZE = 12;
const BRANDING_FONT_SIZE = 10;
const BRANDING_TEXT = "Quick Memos for Obsidian";
const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const PIXEL_RATIO = 2;

/** Regex to match image embeds like ![[image.png]] */
const IMAGE_EMBED_RE = /!\[\[([^\]]+)\]\]/g;

/** Image dimensions for export */
const IMAGE_MAX_WIDTH = CARD_WIDTH - PADDING_X * 2;
const IMAGE_MAX_HEIGHT = 300;

/** Extract image embed filenames from content. */
function extractImageEmbeds(content: string): string[] {
  const names: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(IMAGE_EMBED_RE.source, IMAGE_EMBED_RE.flags);
  while ((m = re.exec(content)) !== null) {
    names.push(m[1]);
  }
  return names;
}

/** Strip image embed syntax from content text. */
function stripImageEmbeds(content: string): string {
  return content.replace(IMAGE_EMBED_RE, "").trim();
}

/** Load a vault image file as an HTMLImageElement. */
async function loadVaultImage(app: App, filename: string): Promise<HTMLImageElement | null> {
  // Find the file in the vault
  const files = app.vault.getFiles();
  const imageFile = files.find(
    (f) => f.name === filename || f.path.endsWith(filename)
  );
  if (!imageFile) return null;

  try {
    const arrayBuf = await app.vault.readBinary(imageFile);
    const blob = new Blob([arrayBuf]);
    const url = URL.createObjectURL(blob);

    return new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null as unknown as HTMLImageElement);
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

/**
 * Calculate scaled dimensions to fit within max bounds while preserving aspect ratio.
 */
function fitImage(
  imgW: number,
  imgH: number,
  maxW: number,
  maxH: number
): { w: number; h: number } {
  const ratio = Math.min(maxW / imgW, maxH / imgH, 1);
  return { w: Math.round(imgW * ratio), h: Math.round(imgH * ratio) };
}

/** A text segment: either plain text or a #tag. */
interface TextSegment {
  text: string;
  isTag: boolean;
}

/** Parse content into lines of segments. */
function parseContentSegments(content: string): TextSegment[][] {
  const lines = content.split("\n");
  const result: TextSegment[][] = [];
  const re = new RegExp(INLINE_TAG_RE.source, INLINE_TAG_RE.flags);

  for (const line of lines) {
    const segments: TextSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    re.lastIndex = 0;

    while ((match = re.exec(line)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: line.slice(lastIndex, match.index), isTag: false });
      }
      segments.push({ text: `#${match[1]}`, isTag: true });
      lastIndex = re.lastIndex;
    }
    if (lastIndex < line.length) {
      segments.push({ text: line.slice(lastIndex), isTag: false });
    }
    // Empty line → push one empty segment so it still gets a line break
    if (segments.length === 0) {
      segments.push({ text: "", isTag: false });
    }
    result.push(segments);
  }
  return result;
}

/**
 * Word-wrap segments into visual lines that fit within maxWidth.
 * Each visual line is an array of { text, isTag, x } positioned segments.
 */
interface PositionedSegment {
  text: string;
  isTag: boolean;
  x: number;
}

function wrapSegmentLines(
  ctx: CanvasRenderingContext2D,
  segments: TextSegment[][],
  maxWidth: number,
  fontSize: number
): PositionedSegment[][] {
  const visualLines: PositionedSegment[][] = [];

  for (const lineSegments of segments) {
    let currentLine: PositionedSegment[] = [];
    let lineX = 0;

    for (const seg of lineSegments) {
      // Set font weight for measurement
      ctx.font = seg.isTag
        ? `500 ${fontSize}px ${FONT_FAMILY}`
        : `normal ${fontSize}px ${FONT_FAMILY}`;

      // Split by character for CJK-friendly wrapping
      const chars = Array.from(seg.text);
      let buf = "";

      for (const ch of chars) {
        const testWidth = ctx.measureText(buf + ch).width;
        if (lineX + testWidth > maxWidth && (buf.length > 0 || currentLine.length > 0)) {
          // Flush current buffer as a segment
          if (buf.length > 0) {
            currentLine.push({ text: buf, isTag: seg.isTag, x: lineX });
            lineX += ctx.measureText(buf).width;
          }
          // Start new visual line
          visualLines.push(currentLine);
          currentLine = [];
          lineX = 0;
          buf = ch;
        } else {
          buf += ch;
        }
      }

      // Flush remaining buffer
      if (buf.length > 0) {
        currentLine.push({ text: buf, isTag: seg.isTag, x: lineX });
        lineX += ctx.measureText(buf).width;
      }
    }

    visualLines.push(currentLine);
  }

  return visualLines;
}

/** Generate a PNG Blob by drawing directly onto a Canvas. */
async function generateImage(
  app: App,
  memo: MemoNote,
  options: { authorName?: string; isDarkMode: boolean; showBranding: boolean }
): Promise<Blob> {
  const theme = options.isDarkMode ? DARK_THEME : LIGHT_THEME;
  const scale = PIXEL_RATIO;
  const maxTextWidth = CARD_WIDTH - PADDING_X * 2;
  const lineHeight = CONTENT_FONT_SIZE * CONTENT_LINE_HEIGHT;

  // --- Load images ---
  const imageNames = extractImageEmbeds(memo.content);
  const loadedImages: Array<{ img: HTMLImageElement; w: number; h: number }> = [];
  for (const name of imageNames) {
    const img = await loadVaultImage(app, name);
    if (img && img.naturalWidth > 0) {
      const { w, h } = fitImage(img.naturalWidth, img.naturalHeight, IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT);
      loadedImages.push({ img, w, h });
    }
  }

  // --- Measure pass: determine card height ---
  const measureCanvas = document.createElement("canvas");
  measureCanvas.width = CARD_WIDTH * scale;
  measureCanvas.height = 1;
  const mCtx = measureCanvas.getContext("2d")!;
  mCtx.scale(scale, scale);
  mCtx.font = `normal ${CONTENT_FONT_SIZE}px ${FONT_FAMILY}`;

  const textContent = stripImageEmbeds(memo.content);
  const segmentLines = parseContentSegments(textContent);
  const wrappedLines = wrapSegmentLines(mCtx, segmentLines, maxTextWidth, CONTENT_FONT_SIZE);

  const contentHeight = wrappedLines.length * lineHeight;

  // Calculate total image height
  const imageGap = 8;
  let totalImageHeight = 0;
  if (loadedImages.length > 0) {
    totalImageHeight = imageGap; // gap before first image
    for (const { h } of loadedImages) {
      totalImageHeight += h + imageGap;
    }
  }

  const metaGap = 20; // space between content and meta divider
  const dividerHeight = 1;
  const metaPaddingTop = 14;
  const footerHeight = META_FONT_SIZE * 1.5;
  const brandingOnSeparateLine = options.showBranding && !!options.authorName;
  const brandingHeight = brandingOnSeparateLine ? BRANDING_FONT_SIZE + 16 : 0;

  const totalHeight =
    PADDING_TOP +
    contentHeight +
    totalImageHeight +
    metaGap +
    dividerHeight +
    metaPaddingTop +
    footerHeight +
    brandingHeight +
    PADDING_BOTTOM;

  // --- Draw pass ---
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH * scale;
  canvas.height = totalHeight * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // Background with rounded rectangle + gradient
  const grad = ctx.createLinearGradient(0, 0, CARD_WIDTH * 0.6, totalHeight * 0.6);
  grad.addColorStop(0, theme.bgGradientStart);
  grad.addColorStop(1, theme.bgGradientEnd);
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, CARD_WIDTH, totalHeight, BORDER_RADIUS);
  ctx.fill();

  // --- Draw content ---
  let y = PADDING_TOP + CONTENT_FONT_SIZE; // baseline of first line

  for (const vLine of wrappedLines) {
    for (const seg of vLine) {
      if (seg.isTag) {
        ctx.font = `500 ${CONTENT_FONT_SIZE}px ${FONT_FAMILY}`;
        ctx.fillStyle = theme.tagColor;
      } else {
        ctx.font = `normal ${CONTENT_FONT_SIZE}px ${FONT_FAMILY}`;
        ctx.fillStyle = theme.textColor;
      }
      ctx.fillText(seg.text, PADDING_X + seg.x, y);
    }
    y += lineHeight;
  }

  // --- Draw images ---
  if (loadedImages.length > 0) {
    y += imageGap;
    for (const { img, w, h } of loadedImages) {
      // Center the image horizontally
      const imgX = PADDING_X + (maxTextWidth - w) / 2;
      // Draw with rounded corners by clipping
      ctx.save();
      roundRect(ctx, imgX, y - CONTENT_FONT_SIZE, w, h, 6);
      ctx.clip();
      ctx.drawImage(img, imgX, y - CONTENT_FONT_SIZE, w, h);
      ctx.restore();
      y += h + imageGap;
    }
  }

  // --- Divider line ---
  const dividerY = PADDING_TOP + contentHeight + totalImageHeight + metaGap;
  ctx.fillStyle = theme.metaBorderColor;
  ctx.fillRect(PADDING_X, dividerY, maxTextWidth, dividerHeight);

  // --- Footer: time (left) and author (right) ---
  const footerY = dividerY + dividerHeight + metaPaddingTop + META_FONT_SIZE;

  // Time
  const d = new Date(memo.created);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const timeText = `${yyyy}-${mm}-${dd} ${hh}:${min}`;

  ctx.font = `300 ${META_FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.fillStyle = theme.timeColor;
  ctx.fillText(timeText, PADDING_X, footerY);

  // Author (right-aligned)
  if (options.authorName) {
    const authorText = `\u2014 ${options.authorName}`;
    ctx.font = `italic 400 ${META_FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.fillStyle = theme.authorColor;
    const authorWidth = ctx.measureText(authorText).width;
    ctx.fillText(authorText, CARD_WIDTH - PADDING_X - authorWidth, footerY);
  }

  // --- Branding ---
  if (options.showBranding) {
    ctx.font = `300 ${BRANDING_FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.fillStyle = theme.brandingColor;
    const brandingWidth = ctx.measureText(BRANDING_TEXT).width;
    if (options.authorName) {
      // Separate line below footer when author is shown
      const brandingY = footerY + BRANDING_FONT_SIZE + 16;
      ctx.fillText(BRANDING_TEXT, CARD_WIDTH - PADDING_X - brandingWidth, brandingY);
    } else {
      // Same line as time when no author
      ctx.fillText(BRANDING_TEXT, CARD_WIDTH - PADDING_X - brandingWidth, footerY);
    }
  }

  // --- Export to Blob ---
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      "image/png"
    );
  });
}

/** Draw a rounded rectangle path (does not fill/stroke). */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ---------------------------------------------------------------------------
   DOM preview builder (for the modal preview — uses CSS classes from styles.css)
   --------------------------------------------------------------------------- */

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
 * Build a standalone export card DOM element for the modal preview.
 * This uses CSS classes — it is only shown inside the modal, NOT used
 * for image generation (Canvas handles that directly).
 */
export async function buildExportCard(
  app: App,
  memo: MemoNote,
  options: { authorName?: string; isDarkMode: boolean; showBranding: boolean }
): Promise<HTMLDivElement> {
  const card = document.createElement("div");
  card.className = "memos-export-card";
  if (options.isDarkMode) card.classList.add("memos-export-dark");

  // Content (text only, images stripped)
  const contentDiv = document.createElement("div");
  contentDiv.className = "memos-export-content";
  renderExportContent(stripImageEmbeds(memo.content), contentDiv);
  card.appendChild(contentDiv);

  // Images
  const imageNames = extractImageEmbeds(memo.content);
  for (const name of imageNames) {
    // For preview, create a blob URL that stays alive
    const files = app.vault.getFiles();
    const imageFile = files.find(
      (f) => f.name === name || f.path.endsWith(name)
    );
    if (!imageFile) continue;
    try {
      const arrayBuf = await app.vault.readBinary(imageFile);
      const blob = new Blob([arrayBuf]);
      const url = URL.createObjectURL(blob);
      const imgEl = document.createElement("img");
      imgEl.src = url;
      imgEl.style.maxWidth = `${IMAGE_MAX_WIDTH}px`;
      imgEl.style.maxHeight = `${IMAGE_MAX_HEIGHT}px`;
      imgEl.style.borderRadius = "6px";
      imgEl.style.display = "block";
      imgEl.style.margin = "8px auto";
      card.appendChild(imgEl);
    } catch {
      // skip unreadable images
    }
  }

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

  // Branding
  if (options.showBranding) {
    if (options.authorName) {
      // Separate line below footer when author is shown
      const branding = document.createElement("div");
      branding.className = "memos-export-branding";
      branding.textContent = BRANDING_TEXT;
      meta.appendChild(branding);
    } else {
      // Same line as time (inside footer row) when no author
      const branding = document.createElement("span");
      branding.className = "memos-export-branding";
      branding.textContent = BRANDING_TEXT;
      footer.appendChild(branding);
    }
  }

  card.appendChild(meta);

  return card;
}

/* ---------------------------------------------------------------------------
   Export modal
   --------------------------------------------------------------------------- */

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

    // Build the export card preview (DOM-based, for visual preview only)
    const authorName = this.plugin.settings.showAuthorInExport
      ? this.plugin.settings.authorName
      : undefined;
    const showBranding = this.plugin.settings.showBrandingInExport;
    const cardEl = await buildExportCard(this.app, this.memo, { authorName, isDarkMode, showBranding });

    // Preview section — keep card at 440px, scale to fit on mobile
    const previewContainer = contentEl.createDiv("memos-export-preview");
    const cardWrapper = previewContainer.createDiv("memos-export-card-wrapper");
    cardWrapper.appendChild(cardEl);

    // After layout: scale card to fit container width if needed
    setTimeout(() => {
      const containerWidth = previewContainer.clientWidth - 40; // minus padding
      const cardWidth = 440;
      if (containerWidth > 0 && containerWidth < cardWidth) {
        const scale = containerWidth / cardWidth;
        cardEl.style.transform = `scale(${scale})`;
        cardEl.style.transformOrigin = "top left";
        const cardHeight = cardEl.offsetHeight;
        cardWrapper.style.width = `${cardWidth * scale}px`;
        cardWrapper.style.height = `${cardHeight * scale}px`;
        cardWrapper.style.overflow = "hidden";
      }
    }, 50);

    // Action buttons
    const btnRow = contentEl.createDiv("memos-export-btn-row");

    const saveBtn = btnRow.createEl("button", {
      cls: "memos-export-btn mod-cta",
      text: i18n.saveAsPng,
    });
    saveBtn.addEventListener("click", () => this.handleSave(isDarkMode));

    const copyBtn = btnRow.createEl("button", {
      cls: "memos-export-btn",
      text: i18n.copyToClipboard,
    });
    copyBtn.addEventListener("click", () => this.handleCopy(isDarkMode));
  }

  /** Build filename from memo date. */
  private buildFilename(): string {
    const d = new Date(this.memo.created);
    return `memo-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}.png`;
  }

  /** Get export options for Canvas image generation. */
  private getExportOptions(isDarkMode: boolean) {
    const authorName = this.plugin.settings.showAuthorInExport
      ? this.plugin.settings.authorName
      : undefined;
    const showBranding = this.plugin.settings.showBrandingInExport;
    return { authorName, isDarkMode, showBranding };
  }

  async handleSave(isDarkMode: boolean) {
    try {
      const blob = await generateImage(this.app, this.memo, this.getExportOptions(isDarkMode));
      const fname = this.buildFilename();

      if (Platform.isMobile) {
        await this.handleMobileSave(blob, fname);
      } else {
        // Desktop: trigger browser download via <a> element
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        new Notice(i18n.imageSaved);
      }

      this.close();
    } catch (err) {
      new Notice(
        t("exportFailed", { err: err instanceof Error ? err.message : String(err) })
      );
    }
  }

  /** Mobile save: try Web Share API first, fall back to saving into the vault. */
  private async handleMobileSave(blob: Blob, fname: string) {
    // Try the Web Share API (lets user save to photos, send to apps, etc.)
    const file = new File([blob], fname, { type: "image/png" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return; // user handled via share sheet
      } catch (shareErr: unknown) {
        // User cancelled or share failed — fall through to vault save
        if (shareErr instanceof Error && shareErr.name === "AbortError") return;
      }
    }

    // Fallback: save into the vault so user can find the file
    const saveFolder = this.plugin.settings.saveFolder;
    const vaultPath = `${saveFolder}/${fname}`;
    const arrayBuf = await blob.arrayBuffer();
    await this.app.vault.createBinary(vaultPath, arrayBuf);
    new Notice(t("imageSavedTo", { path: vaultPath }));
  }

  async handleCopy(isDarkMode: boolean) {
    try {
      const blob = await generateImage(this.app, this.memo, this.getExportOptions(isDarkMode));

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      new Notice(i18n.imageCopied);
      this.close();
    } catch (err) {
      new Notice(
        t("copyFailed", { err: err instanceof Error ? err.message : String(err) })
      );
    }
  }

  onClose() {
    // Let Obsidian handle DOM cleanup — avoid synchronous heavy DOM teardown
    // that causes visible lag when closing the modal.
  }
}
