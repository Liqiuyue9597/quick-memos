import { describe, it, expect, vi } from "vitest";
import { App, MetadataCache, TFile, TFolder, Vault, WorkspaceLeaf } from "obsidian";

import { CaptureItemView } from "../src/capture-view";
import { loadTagSuggestions, rankTagSuggestions } from "../src/tag-suggestions";
import { DEFAULT_SETTINGS, MemosSettings } from "../src/types";
import type MemosPlugin from "../src/plugin";

function createMockPlugin(overrides?: Partial<MemosSettings>): MemosPlugin {
  return {
    settings: { ...DEFAULT_SETTINGS, ...overrides },
    saveSettings: vi.fn().mockResolvedValue(undefined),
    activateCaptureView: vi.fn(),
    activateView: vi.fn().mockResolvedValue(undefined),
  } as unknown as MemosPlugin;
}

function createMemoFile(path: string, name: string): TFile {
  const file = new TFile();
  file.path = path;
  file.name = name;
  file.basename = name.replace(/\.md$/, "");
  file.extension = "md";
  file.stat = { ctime: Date.now(), mtime: Date.now(), size: 100 };
  return file;
}

function setupVaultWithMemos(
  app: App,
  folder: string,
  memos: Array<{
    name: string;
    created: string;
    body: string;
    tags?: string[];
    noFrontmatterCache?: boolean;
  }>
) {
  const vault = app.vault as Vault;
  const cache = app.metadataCache as MetadataCache;
  const folderNode = new TFolder();
  folderNode.path = folder;
  const children: TFile[] = [];

  for (const memo of memos) {
    const filePath = `${folder}/${memo.name}`;
    const file = createMemoFile(filePath, memo.name);
    const tagsYaml =
      memo.tags && memo.tags.length > 0
        ? `tags:\n${memo.tags.map((tag) => `  - ${tag}`).join("\n")}`
        : "tags: []";
    const frontmatter = `---\ncreated: ${memo.created}\ntype: memo\n${tagsYaml}\n---`;
    const raw = `${frontmatter}\n\n${memo.body}`;

    vault._files.set(filePath, raw);
    if (!memo.noFrontmatterCache) {
      cache._cache.set(filePath, {
        frontmatter: {
          created: memo.created,
          type: "memo",
          tags: memo.tags ?? [],
        },
        frontmatterPosition: { end: { offset: frontmatter.length + 1 } },
      });
    }
    children.push(file);
  }

  folderNode.children = children;
  vault._abstractFiles.set(folder, folderNode);
}

describe("rankTagSuggestions", () => {
  it("sorts by frequency first and recency second", () => {
    const ranked = rankTagSuggestions(
      [
        { tag: "frequent", count: 3, lastUsed: Date.parse("2026-03-10T00:00:00Z") },
        { tag: "fresh", count: 1, lastUsed: Date.parse("2026-03-15T00:00:00Z") },
        { tag: "stale", count: 1, lastUsed: Date.parse("2026-03-01T00:00:00Z") },
      ],
      6
    );

    expect(ranked[0]).toBe("frequent");
    expect(ranked.indexOf("fresh")).toBeLessThan(ranked.indexOf("stale"));
  });

  it("limits and deduplicates the result order via the usage list", () => {
    const ranked = rankTagSuggestions(
      [
        { tag: "alpha", count: 2, lastUsed: 3 },
        { tag: "beta", count: 2, lastUsed: 2 },
        { tag: "gamma", count: 1, lastUsed: 5 },
      ],
      2
    );

    expect(ranked).toEqual(["alpha", "beta"]);
  });
});

describe("loadTagSuggestions", () => {
  it("builds a unique suggestion list from memo history", async () => {
    const app = new App();
    setupVaultWithMemos(app, "Memos", [
      {
        name: "memo-1.md",
        created: "2026-03-15T10:00:00.000Z",
        tags: ["frequent", "fresh"],
        body: "Body #fresh #fresh",
      },
      {
        name: "memo-2.md",
        created: "2026-03-14T10:00:00.000Z",
        tags: ["frequent"],
        body: "Body #frequent",
      },
      {
        name: "memo-3.md",
        created: "2026-03-13T10:00:00.000Z",
        tags: ["frequent", "stale"],
        body: "Body #stale",
      },
      {
        name: "memo-4.md",
        created: "2026-03-01T10:00:00.000Z",
        tags: ["older"],
        body: "Body #older",
      },
    ]);

    const suggestions = await loadTagSuggestions(app, "Memos", { limit: 6 });

    expect(suggestions[0]).toBe("frequent");
    expect(suggestions.indexOf("fresh")).toBeLessThan(suggestions.indexOf("older"));
    expect(new Set(suggestions).size).toBe(suggestions.length);
  });

  it("deduplicates repeated tags inside the same memo", async () => {
    const app = new App();
    setupVaultWithMemos(app, "Memos", [
      {
        name: "memo-1.md",
        created: "2026-03-15T10:00:00.000Z",
        tags: ["shared"],
        body: "Body #shared #shared #shared",
      },
    ]);

    const suggestions = await loadTagSuggestions(app, "Memos", { limit: 6 });

    expect(suggestions).toEqual(["shared"]);
  });

  it("excludes fixed tags when requested", async () => {
    const app = new App();
    setupVaultWithMemos(app, "Memos", [
      {
        name: "memo-1.md",
        created: "2026-03-15T10:00:00.000Z",
        tags: ["fixed", "other"],
        body: "Body #fixed #other",
      },
    ]);

    const suggestions = await loadTagSuggestions(app, "Memos", {
      limit: 6,
      excludedTags: ["fixed"],
    });

    expect(suggestions).toEqual(["other"]);
  });
});

describe("CaptureItemView tag row", () => {
  it("renders suggested tags before the add button", () => {
    const app = new App();
    const plugin = createMockPlugin();
    const leaf = new WorkspaceLeaf(app);
    const view = new CaptureItemView(leaf, plugin);

    const calls: string[] = [];
    const fakeElement = {
      createSpan: vi.fn(() => fakeElement),
      addEventListener: vi.fn(),
      setText: vi.fn(),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    };
    const fakeContainer = {
      empty: vi.fn(() => calls.push("empty")),
      createDiv: vi.fn((cls?: string) => {
        calls.push(cls ?? "");
        return fakeElement;
      }),
      querySelector: vi.fn(),
    };

    (view as any).tags = ["selected"];
    (view as any).suggestedTags = ["suggested-a", "suggested-b"];
    (view as any).tagsContainer = fakeContainer;

    (view as any).renderTags();

    expect(calls).toEqual([
      "empty",
      "memos-capture-card-tag",
      "memos-capture-card-tag memos-capture-card-tag-suggestion",
      "memos-capture-card-tag memos-capture-card-tag-suggestion",
      "memos-capture-card-tag-add",
    ]);
  });
});
