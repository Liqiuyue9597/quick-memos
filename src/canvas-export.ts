import { App, normalizePath, Notice, TFile } from "obsidian";
import { MemoNote } from "./types";
import { i18n, t } from "./i18n";

/* ---------------------------------------------------------------------------
   Canvas data structures (subset of Obsidian's Canvas JSON format)
   --------------------------------------------------------------------------- */

interface CanvasNode {
  id: string;
  type: "file";
  file: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasData {
  nodes: CanvasNode[];
  edges: unknown[];
}

/* ---------------------------------------------------------------------------
   Layout constants
   --------------------------------------------------------------------------- */

const CARD_W = 260;
const CARD_H = 160;
const GAP_Y = 20;
const GROUP_GAP_X = 80;

/**
 * Export the given memos to a Canvas file, grouped by first tag.
 * Opens the Canvas after creation.
 */
export async function exportToCanvas(
  app: App,
  memos: MemoNote[],
  canvasName?: string
) {
  if (memos.length === 0) {
    new Notice(i18n.noMemosToExport);
    return;
  }

  // Group memos by their first tag (or "untagged")
  const groups = new Map<string, MemoNote[]>();
  for (const memo of memos) {
    const groupKey = memo.tags.length > 0 ? memo.tags[0] : "untagged";
    const list = groups.get(groupKey) ?? [];
    list.push(memo);
    groups.set(groupKey, list);
  }

  // Build canvas nodes — each group forms a column
  const nodes: CanvasNode[] = [];
  let groupX = 0;

  for (const [, groupMemos] of groups) {
    for (let i = 0; i < groupMemos.length; i++) {
      const memo = groupMemos[i];
      nodes.push({
        id: memo.file.basename,
        type: "file",
        file: memo.file.path,
        x: groupX,
        y: i * (CARD_H + GAP_Y),
        width: CARD_W,
        height: CARD_H,
      });
    }
    groupX += CARD_W + GROUP_GAP_X;
  }

  const canvasData: CanvasData = { nodes, edges: [] };
  const filename =
    canvasName ||
    `Memo Board ${new Date().toISOString().slice(0, 10)}.canvas`;
  const path = normalizePath(filename);
  const content = JSON.stringify(canvasData, null, 2);

  // Create or overwrite the canvas file
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing && existing instanceof TFile) {
    await app.vault.modify(existing, content);
  } else {
    await app.vault.create(path, content);
  }

  // Open the canvas in a new tab
  const canvasFile = app.vault.getAbstractFileByPath(path);
  if (canvasFile && canvasFile instanceof TFile) {
    const leaf = app.workspace.getLeaf("tab");
    await leaf.openFile(canvasFile);
  }

  new Notice(t("exportedToCanvas", { count: memos.length }));
}
