import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  App,
  TFile,
  TFolder,
  WorkspaceLeaf,
  Vault,
  MetadataCache,
} from "obsidian";
import { MemosView } from "../src/view";
import { DEFAULT_SETTINGS, MemosSettings } from "../src/types";
import type MemosPlugin from "../src/plugin";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a stub MemosPlugin with DEFAULT_SETTINGS and optional overrides. */
function createMockPlugin(overrides?: Partial<MemosSettings>): MemosPlugin {
  return {
    settings: { ...DEFAULT_SETTINGS, ...overrides },
    saveSettings: vi.fn().mockResolvedValue(undefined),
    activateCaptureView: vi.fn(),
    activateView: vi.fn().mockResolvedValue(undefined),
  } as unknown as MemosPlugin;
}

/** Construct a MemosView wired to the given plugin and app. */
function createView(plugin?: MemosPlugin, app?: App): MemosView {
  const testApp = app ?? new App();
  const leaf = new WorkspaceLeaf(testApp);
  const p = plugin ?? createMockPlugin();
  return new MemosView(leaf, p);
}

/** Create a TFile configured with the given path and name. */
function createMemoFile(path: string, name: string): TFile {
  const f = new TFile();
  f.path = path;
  f.name = name;
  f.basename = name.replace(/\.md$/, "");
  f.extension = "md";
  f.stat = { ctime: Date.now(), mtime: Date.now(), size: 100 };
  return f;
}

/**
 * Populate vault and metadataCache with test memo data.
 *
 * Each entry in `memos` should provide:
 *   - name: filename (e.g. "memo-1.md")
 *   - created: ISO date string
 *   - body: text content
 *   - tags?: frontmatter tags
 *   - type?: frontmatter type (defaults to "memo")
 *   - mood?, source?: optional fields
 */
function setupVaultWithMemos(
  app: App,
  folder: string,
  memos: Array<{
    name: string;
    created: string;
    body: string;
    tags?: string[];
    type?: string;
    mood?: string;
    source?: string;
    noFrontmatterCache?: boolean;
  }>
) {
  const vault = app.vault as Vault;
  const cache = app.metadataCache as MetadataCache;

  // Create the TFolder
  const tFolder = new TFolder();
  tFolder.path = folder;

  const children: TFile[] = [];

  for (const memo of memos) {
    const filePath = `${folder}/${memo.name}`;
    const file = createMemoFile(filePath, memo.name);

    // Build raw file content with frontmatter
    const fmType = memo.type ?? "memo";
    const tagsYaml =
      memo.tags && memo.tags.length > 0
        ? `tags:\n${memo.tags.map((t) => `  - ${t}`).join("\n")}`
        : "tags: []";
    let extraYaml = "";
    if (memo.mood) extraYaml += `mood: "${memo.mood}"\n`;
    if (memo.source) extraYaml += `source: "${memo.source}"\n`;

    const frontmatter = `---\ncreated: ${memo.created}\ntype: ${fmType}\n${tagsYaml}\n${extraYaml}---`;
    const raw = `${frontmatter}\n\n${memo.body}`;

    // Store raw content for vault.read()
    vault._files.set(filePath, raw);

    // Store metadata cache
    if (!memo.noFrontmatterCache) {
      const fmObj: Record<string, unknown> = {
        created: memo.created,
        type: fmType,
        tags: memo.tags ?? [],
      };
      if (memo.mood) fmObj.mood = memo.mood;
      if (memo.source) fmObj.source = memo.source;

      cache._cache.set(filePath, {
        frontmatter: fmObj,
        frontmatterPosition: { end: { offset: frontmatter.length + 1 } },
      });
    }
    // If noFrontmatterCache, leave _cache without an entry for this file

    children.push(file);
  }

  tFolder.children = children;
  vault._abstractFiles.set(folder, tFolder);
}

// ---------------------------------------------------------------------------
// a) Event Registration
// ---------------------------------------------------------------------------
describe("Event Registration", () => {
  let view: MemosView;
  let app: App;

  beforeEach(async () => {
    app = new App();
    const plugin = createMockPlugin();
    view = createView(plugin, app);
    vi.spyOn(view, "refresh").mockResolvedValue(undefined);
    await view.onOpen();
  });

  it("registers vault 'create' event", () => {
    const createRefs = view._registeredEvents.filter(
      (ref) => ref.evtName === "create"
    );
    expect(createRefs.length).toBe(1);
  });

  it("registers vault 'delete' event", () => {
    const deleteRefs = view._registeredEvents.filter(
      (ref) => ref.evtName === "delete"
    );
    expect(deleteRefs.length).toBe(1);
  });

  it("registers metadataCache 'changed' event", () => {
    const changedRefs = view._registeredEvents.filter(
      (ref) => ref.evtName === "changed"
    );
    expect(changedRefs.length).toBe(1);
  });

  it("does NOT register vault 'modify' event — key regression test", () => {
    const modifyHandlers = (app.vault as Vault)._handlers.get("modify");
    expect(modifyHandlers ?? []).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// b) Event Filtering
// ---------------------------------------------------------------------------
describe("Event Filtering", () => {
  let view: MemosView;
  let app: App;
  let refreshSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    app = new App();
    const plugin = createMockPlugin({ saveFolder: "Memos" });
    view = createView(plugin, app);
    refreshSpy = vi.spyOn(view, "refresh").mockResolvedValue(undefined);
    await view.onOpen();
    // Reset call count from the initial refresh in onOpen
    refreshSpy.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ignores create events for files outside save folder", () => {
    const outsideFile = createMemoFile("Other/note.md", "note.md");
    (app.vault as Vault).trigger("create", outsideFile);
    vi.advanceTimersByTime(500);
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("ignores events for TFolder instances", () => {
    const folder = new TFolder();
    folder.path = "Memos/subfolder";
    (app.vault as Vault).trigger("create", folder);
    vi.advanceTimersByTime(500);
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("triggers refresh for files inside save folder (vault create)", () => {
    const file = createMemoFile("Memos/memo-1.md", "memo-1.md");
    (app.vault as Vault).trigger("create", file);
    vi.advanceTimersByTime(300);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it("triggers refresh for metadataCache 'changed' inside save folder", () => {
    const file = createMemoFile("Memos/memo-2.md", "memo-2.md");
    (app.metadataCache as MetadataCache).trigger("changed", file);
    vi.advanceTimersByTime(300);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it("ignores metadataCache 'changed' outside save folder", () => {
    const outsideFile = createMemoFile("Notes/doc.md", "doc.md");
    (app.metadataCache as MetadataCache).trigger("changed", outsideFile);
    vi.advanceTimersByTime(500);
    expect(refreshSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// c) Debouncing
// ---------------------------------------------------------------------------
describe("Debouncing", () => {
  let view: MemosView;
  let app: App;
  let refreshSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    app = new App();
    const plugin = createMockPlugin({ saveFolder: "Memos" });
    view = createView(plugin, app);
    refreshSpy = vi.spyOn(view, "refresh").mockResolvedValue(undefined);
    await view.onOpen();
    refreshSpy.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires refresh 300ms after a single event", () => {
    const file = createMemoFile("Memos/memo.md", "memo.md");
    (app.vault as Vault).trigger("create", file);

    // Not yet at 300ms
    vi.advanceTimersByTime(299);
    expect(refreshSpy).not.toHaveBeenCalled();

    // At 300ms
    vi.advanceTimersByTime(1);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it("coalesces rapid events into single refresh", () => {
    const file = createMemoFile("Memos/memo.md", "memo.md");

    (app.vault as Vault).trigger("create", file);
    vi.advanceTimersByTime(100);
    (app.vault as Vault).trigger("create", file);
    vi.advanceTimersByTime(100);
    (app.vault as Vault).trigger("create", file);

    // Advance past 300ms from last event
    vi.advanceTimersByTime(300);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it("resets debounce timer on each new event", () => {
    const file = createMemoFile("Memos/memo.md", "memo.md");

    (app.vault as Vault).trigger("create", file);
    vi.advanceTimersByTime(250); // 250ms into first timer
    expect(refreshSpy).not.toHaveBeenCalled();

    // New event resets the timer
    (app.vault as Vault).trigger("create", file);
    vi.advanceTimersByTime(250); // 250ms into second timer — not 300 yet
    expect(refreshSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50); // Now at 300ms from second event
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it("coalesces different event types (create + changed)", () => {
    const file = createMemoFile("Memos/memo.md", "memo.md");

    (app.vault as Vault).trigger("create", file);
    vi.advanceTimersByTime(100);
    (app.metadataCache as MetadataCache).trigger("changed", file);

    vi.advanceTimersByTime(300);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// d) metadataCache changed vs vault modify — Regression
// ---------------------------------------------------------------------------
describe("metadataCache changed vs vault modify — Regression", () => {
  let view: MemosView;
  let app: App;
  let refreshSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    app = new App();
    const plugin = createMockPlugin({ saveFolder: "Memos" });
    view = createView(plugin, app);
    refreshSpy = vi.spyOn(view, "refresh").mockResolvedValue(undefined);
    await view.onOpen();
    refreshSpy.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("vault 'modify' trigger does nothing; metadataCache 'changed' triggers refresh", () => {
    const file = createMemoFile("Memos/memo.md", "memo.md");

    // Vault modify should do nothing (no handler registered)
    (app.vault as Vault).trigger("modify", file);
    vi.advanceTimersByTime(500);
    expect(refreshSpy).not.toHaveBeenCalled();

    // metadataCache changed should trigger refresh
    (app.metadataCache as MetadataCache).trigger("changed", file);
    vi.advanceTimersByTime(300);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it("vault has no 'modify' handler, metadataCache has 'changed' handler", () => {
    const vaultModify = (app.vault as Vault)._handlers.get("modify");
    expect(vaultModify ?? []).toHaveLength(0);

    const cacheChanged = (app.metadataCache as MetadataCache)._handlers.get("changed");
    expect(cacheChanged).toBeDefined();
    expect(cacheChanged!.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// e) loadMemos
// ---------------------------------------------------------------------------
describe("loadMemos", () => {
  let app: App;
  let view: MemosView;

  beforeEach(() => {
    app = new App();
    const plugin = createMockPlugin({ saveFolder: "Memos" });
    view = createView(plugin, app);
  });

  it("returns empty for missing folder", async () => {
    // Don't set up any folder in vault
    await view.loadMemos();
    expect(view.memos).toEqual([]);
  });

  it("returns empty when path is TFile not TFolder", async () => {
    // Register a TFile at the folder path instead of a TFolder
    const file = new TFile();
    file.path = "Memos";
    (app.vault as Vault)._abstractFiles.set("Memos", file as any);
    await view.loadMemos();
    expect(view.memos).toEqual([]);
  });

  it("filters out files without 'type: memo' frontmatter", async () => {
    setupVaultWithMemos(app, "Memos", [
      {
        name: "memo-1.md",
        created: "2026-03-15T10:00:00",
        body: "I am a memo",
        type: "memo",
      },
      {
        name: "note-1.md",
        created: "2026-03-15T11:00:00",
        body: "I am a regular note",
        type: "note",
      },
    ]);

    await view.loadMemos();
    expect(view.memos).toHaveLength(1);
    expect(view.memos[0].content).toBe("I am a memo");
  });

  it("filters out files with no frontmatter cache", async () => {
    setupVaultWithMemos(app, "Memos", [
      {
        name: "memo-good.md",
        created: "2026-03-15T10:00:00",
        body: "Has cache",
        type: "memo",
      },
      {
        name: "memo-bad.md",
        created: "2026-03-15T11:00:00",
        body: "No cache",
        type: "memo",
        noFrontmatterCache: true,
      },
    ]);

    await view.loadMemos();
    expect(view.memos).toHaveLength(1);
    expect(view.memos[0].content).toBe("Has cache");
  });

  it("sorts memos by created date descending", async () => {
    setupVaultWithMemos(app, "Memos", [
      {
        name: "memo-old.md",
        created: "2026-03-10T08:00:00",
        body: "Old memo",
      },
      {
        name: "memo-new.md",
        created: "2026-03-15T12:00:00",
        body: "New memo",
      },
      {
        name: "memo-mid.md",
        created: "2026-03-12T10:00:00",
        body: "Middle memo",
      },
    ]);

    await view.loadMemos();
    expect(view.memos).toHaveLength(3);
    expect(view.memos[0].content).toBe("New memo");
    expect(view.memos[1].content).toBe("Middle memo");
    expect(view.memos[2].content).toBe("Old memo");
  });

  it("parses body content correctly (strips frontmatter)", async () => {
    setupVaultWithMemos(app, "Memos", [
      {
        name: "memo-1.md",
        created: "2026-03-15T10:00:00",
        body: "Hello world\nSecond line",
      },
    ]);

    await view.loadMemos();
    expect(view.memos).toHaveLength(1);
    expect(view.memos[0].content).toBe("Hello world\nSecond line");
  });

  it("merges frontmatter + inline tags", async () => {
    setupVaultWithMemos(app, "Memos", [
      {
        name: "memo-tags.md",
        created: "2026-03-15T10:00:00",
        body: "Some text #inline-tag more text",
        tags: ["frontmatter-tag"],
      },
    ]);

    await view.loadMemos();
    expect(view.memos).toHaveLength(1);
    expect(view.memos[0].tags).toContain("frontmatter-tag");
    expect(view.memos[0].tags).toContain("inline-tag");
  });
});

// ---------------------------------------------------------------------------
// f) onClose Cleanup
// ---------------------------------------------------------------------------
describe("onClose Cleanup", () => {
  let view: MemosView;
  let app: App;
  let refreshSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    app = new App();
    const plugin = createMockPlugin({ saveFolder: "Memos" });
    view = createView(plugin, app);
    refreshSpy = vi.spyOn(view, "refresh").mockResolvedValue(undefined);
    await view.onOpen();
    refreshSpy.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cancels pending debounce timer", async () => {
    const file = createMemoFile("Memos/memo.md", "memo.md");

    // Trigger an event to start the debounce timer
    (app.vault as Vault).trigger("create", file);

    // Close before the timer fires
    await view.onClose();

    // Advance well past the debounce period
    vi.advanceTimersByTime(1000);
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("is safe to call with no pending timer", async () => {
    // No events triggered, no timer pending
    await expect(view.onClose()).resolves.toBeUndefined();
  });

  it("is safe to call multiple times", async () => {
    const file = createMemoFile("Memos/memo.md", "memo.md");
    (app.vault as Vault).trigger("create", file);

    await view.onClose();
    await view.onClose();
    await view.onClose();

    vi.advanceTimersByTime(1000);
    expect(refreshSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// g) Delete Navigation
// ---------------------------------------------------------------------------
describe("Delete Navigation", () => {
  let view: MemosView;
  let app: App;
  let plugin: MemosPlugin;
  let refreshSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    app = new App();
    plugin = createMockPlugin({ saveFolder: "Memos" });
    view = createView(plugin, app);
    refreshSpy = vi.spyOn(view, "refresh").mockResolvedValue(undefined);
    await view.onOpen();
    refreshSpy.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("activates Memos view when deleted file is open in an editor", () => {
    const file = createMemoFile("Memos/memo-1.md", "memo-1.md");

    // Create a mock leaf that has the deleted file open
    const mockLeaf = new WorkspaceLeaf(app);
    mockLeaf.view = { file };

    vi.spyOn(app.workspace, "getLeavesOfType").mockReturnValue([mockLeaf]);

    (app.vault as Vault).trigger("delete", file);

    expect(plugin.activateView).toHaveBeenCalled();
  });

  it("does NOT navigate when deleted file is not open in any editor", () => {
    const file = createMemoFile("Memos/memo-1.md", "memo-1.md");

    // No leaves have this file open
    vi.spyOn(app.workspace, "getLeavesOfType").mockReturnValue([]);

    (app.vault as Vault).trigger("delete", file);

    expect(plugin.activateView).not.toHaveBeenCalled();
  });

  it("activates Memos view only once even with multiple tabs open", () => {
    const file = createMemoFile("Memos/memo-1.md", "memo-1.md");

    const leaf1 = new WorkspaceLeaf(app);
    leaf1.view = { file };

    const leaf2 = new WorkspaceLeaf(app);
    leaf2.view = { file };

    vi.spyOn(app.workspace, "getLeavesOfType").mockReturnValue([leaf1, leaf2]);

    (app.vault as Vault).trigger("delete", file);

    // activateView is called exactly once regardless of how many tabs match
    expect(plugin.activateView).toHaveBeenCalledTimes(1);
  });

  it("does NOT navigate for files outside save folder", () => {
    const file = createMemoFile("Other/note.md", "note.md");

    vi.spyOn(app.workspace, "getLeavesOfType").mockReturnValue([]);

    (app.vault as Vault).trigger("delete", file);

    expect(plugin.activateView).not.toHaveBeenCalled();
  });

  it("still calls debouncedRefresh even when navigating", () => {
    const file = createMemoFile("Memos/memo-1.md", "memo-1.md");

    const mockLeaf = new WorkspaceLeaf(app);
    mockLeaf.view = { file };

    vi.spyOn(app.workspace, "getLeavesOfType").mockReturnValue([mockLeaf]);

    (app.vault as Vault).trigger("delete", file);

    // debouncedRefresh fires after 300ms
    vi.advanceTimersByTime(300);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});
