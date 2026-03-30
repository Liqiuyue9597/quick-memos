import { App, TFile, TFolder, normalizePath } from "obsidian";

import { parseMemoContent } from "./memo-parser";

export interface TagUsage {
  tag: string;
  count: number;
  lastUsed: number;
}

export interface TagSuggestionOptions {
  limit?: number;
  excludedTags?: Iterable<string>;
}

function normalizeTag(tag: string): string {
  return tag.replace(/^#+/, "").trim();
}

/**
 * Rank tag suggestions by usage frequency, then by most recent use.
 * The resulting list is deduplicated and limited to the requested size.
 */
export function rankTagSuggestions(usages: TagUsage[], limit = 6): string[] {
  return usages
    .slice()
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.lastUsed !== a.lastUsed) return b.lastUsed - a.lastUsed;
      return a.tag.localeCompare(b.tag);
    })
    .slice(0, limit)
    .map((usage) => usage.tag);
}

/**
 * Scan a memo folder and build a short list of tag suggestions from all
 * `type: memo` files found there.
 */
export async function loadTagSuggestions(
  app: App,
  folderPath: string,
  options: TagSuggestionOptions = {}
): Promise<string[]> {
  const folder = normalizePath(folderPath);
  const abstractFolder = app.vault.getAbstractFileByPath(folder);

  if (!abstractFolder || !(abstractFolder instanceof TFolder)) {
    return [];
  }

  const excluded = new Set(
    Array.from(options.excludedTags ?? [], (tag) => normalizeTag(tag)).filter(Boolean)
  );
  const usageMap = new Map<string, TagUsage>();
  const limit = options.limit ?? 6;

  const files = abstractFolder.children.filter(
    (child): child is TFile => child instanceof TFile && child.extension.toLowerCase() === "md"
  );

  await Promise.all(
    files.map(async (file) => {
      const cache = app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter;
      if (!fm || fm["type"] !== "memo") return;

      const raw = await app.vault.read(file);
      const { tags } = parseMemoContent(raw, fm, cache?.frontmatterPosition?.end?.offset);
      const created =
        typeof fm["created"] === "string"
          ? Date.parse(fm["created"])
          : Number.isFinite(file.stat.ctime)
            ? file.stat.ctime
            : Date.now();

      const uniqueTags = new Set(
        tags.map(normalizeTag).filter((tag) => tag.length > 0 && !excluded.has(tag))
      );

      for (const tag of uniqueTags) {
        const usage = usageMap.get(tag);
        if (usage) {
          usage.count += 1;
          usage.lastUsed = Math.max(usage.lastUsed, created);
        } else {
          usageMap.set(tag, { tag, count: 1, lastUsed: created });
        }
      }
    })
  );

  return rankTagSuggestions(Array.from(usageMap.values()), limit);
}
