import { App, Notice, normalizePath, TFile } from "obsidian";
import { extractInlineTags } from "./utils";
import { i18n } from "./i18n";

/**
 * Parse a Flomo HTML export file and import each memo into the vault
 * as individual .md files with proper frontmatter.
 *
 * Flomo HTML structure:
 *   <div class="memo">
 *     <div class="time">2024-01-15 14:30:22</div>
 *     <div class="content"><p>Text with #tags</p></div>
 *     <div class="files"><img src="..." /></div>
 *   </div>
 */

interface FlomoMemo {
  time: string;       // "YYYY-MM-DD HH:mm:ss"
  content: string;    // markdown body
  tags: string[];     // extracted #tags
  images: string[];   // image filenames
}

/** Convert HTML content elements to markdown. */
function htmlToMarkdown(contentEl: Element): string {
  const lines: string[] = [];

  for (const child of contentEl.children) {
    const tag = child.tagName.toLowerCase();

    if (tag === "p") {
      lines.push(child.textContent?.trim() ?? "");
    } else if (tag === "ul") {
      for (const li of child.children) {
        if (li.tagName.toLowerCase() === "li") {
          lines.push(`- ${li.textContent?.trim() ?? ""}`);
        }
      }
    } else if (tag === "ol") {
      let idx = 1;
      for (const li of child.children) {
        if (li.tagName.toLowerCase() === "li") {
          lines.push(`${idx}. ${li.textContent?.trim() ?? ""}`);
          idx++;
        }
      }
    } else if (tag === "blockquote") {
      const text = child.textContent?.trim() ?? "";
      lines.push(...text.split("\n").map((l) => `> ${l}`));
    } else {
      // Fallback: just grab text
      const text = child.textContent?.trim();
      if (text) lines.push(text);
    }
  }

  return lines.join("\n");
}

/** Parse Flomo export HTML string into structured memos. */
function parseFlomoHtml(html: string): FlomoMemo[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const memoEls = doc.querySelectorAll(".memo");
  const memos: FlomoMemo[] = [];

  for (const memoEl of memoEls) {
    const timeEl = memoEl.querySelector(".time");
    const contentEl = memoEl.querySelector(".content");
    if (!contentEl) continue;

    const time = timeEl?.textContent?.trim() ?? "";
    const content = htmlToMarkdown(contentEl);
    const tags = extractInlineTags(content);

    // Extract image filenames
    const images: string[] = [];
    const filesEl = memoEl.querySelector(".files");
    if (filesEl) {
      for (const img of filesEl.querySelectorAll("img")) {
        const src = img.getAttribute("src");
        if (src) {
          // src is usually relative like "file/image.png"
          const filename = src.split("/").pop();
          if (filename) images.push(filename);
        }
      }
    }

    if (content.trim()) {
      memos.push({ time, content, tags, images });
    }
  }

  return memos;
}

/** Build a memo .md file content string from a parsed Flomo memo. */
function buildMemoFile(memo: FlomoMemo): string {
  // Parse time → ISO string
  let iso: string;
  try {
    const d = new Date(memo.time.replace(" ", "T"));
    iso = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    iso = new Date().toISOString();
  }

  const tagYaml =
    memo.tags.length > 0
      ? `tags:\n${memo.tags.map((t) => `  - ${t}`).join("\n")}`
      : "tags: []";

  const frontmatter = `---\ncreated: ${iso}\ntype: memo\n${tagYaml}\nstatus: active\nsource: "flomo"\n---\n\n`;

  // Append image embeds if any
  let body = memo.content;
  if (memo.images.length > 0) {
    body += "\n\n" + memo.images.map((img) => `![[${img}]]`).join("\n");
  }

  return frontmatter + body;
}

/** Build a unique filename from a Flomo memo timestamp. */
function buildFilename(time: string, index: number): string {
  // "2024-01-15 14:30:22" → "memo-2024-01-15-14-30-22.md"
  const cleaned = time
    .replace(/[:\s]/g, "-")
    .replace(/[^0-9-]/g, "");

  if (cleaned.length >= 10) {
    return `memo-${cleaned}.md`;
  }
  // Fallback with index
  return `memo-flomo-import-${String(index).padStart(4, "0")}.md`;
}

/**
 * Import Flomo memos from an HTML file into the vault.
 * Returns the count of imported memos.
 */
export async function importFlomoHtml(
  app: App,
  htmlContent: string,
  saveFolder: string
): Promise<number> {
  const memos = parseFlomoHtml(htmlContent);

  if (memos.length === 0) {
    new Notice(i18n.noMemosInHtml);
    return 0;
  }

  const folder = normalizePath(saveFolder);

  // Ensure folder exists
  if (!app.vault.getAbstractFileByPath(folder)) {
    await app.vault.createFolder(folder);
  }

  let imported = 0;
  const existingFiles = new Set(
    (app.vault.getAbstractFileByPath(folder) as any)?.children
      ?.filter((f: any) => f instanceof TFile)
      ?.map((f: TFile) => f.name) ?? []
  );

  for (let i = 0; i < memos.length; i++) {
    const memo = memos[i];
    const filename = buildFilename(memo.time, i);

    // Skip if file already exists (avoid duplicates on re-import)
    if (existingFiles.has(filename)) continue;

    const fileContent = buildMemoFile(memo);
    const filePath = normalizePath(`${folder}/${filename}`);

    try {
      await app.vault.create(filePath, fileContent);
      imported++;
    } catch (err) {
      console.warn(`Failed to import memo ${filename}:`, err);
    }
  }

  return imported;
}
