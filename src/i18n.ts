import { getLanguage } from "obsidian";

/**
 * Minimal i18n module — Chinese + English.
 * Falls back to English for any non-Chinese locale.
 */

interface Messages {
  // ── Plugin ──
  openMemosView: string;
  quickCapture: string;
  memoContentEmpty: string;
  memoSaved: string;
  saveAsMemo: string;
  selectionSavedAsMemo: string;

  // ── View ──
  memosTitle: string;
  memoCount: (n: number) => string;
  newMemo: string;
  randomReview: string;
  sendToCanvas: string;
  noMemosYet: string;
  exportAsImage: string;

  // ── Capture ──
  searchImages: string;
  searchNotes: string;
  quickCaptureTitle: string;
  back: string;
  whatsOnYourMind: string;
  mood: string;
  source: string;
  insertImage: string;
  addTag: string;
  fixedTagHint: string;               // ${tag}
  saveMemo: string;
  addTagButton: string;
  tagPlaceholder: string;
  memoEmpty: string;
  failedToSave: string;               // ${err}

  // ── Settings ──
  memosSettings: string;
  saveFolder: string;
  saveFolderDesc: string;
  useFixedTag: string;
  useFixedTagDesc: string;
  fixedTagValue: string;
  fixedTagValueDesc: string;
  extendedMetadata: string;
  enableMood: string;
  enableMoodDesc: string;
  moodOptions: string;
  moodOptionsDesc: string;
  enableSource: string;
  enableSourceDesc: string;
  sourceOptions: string;
  sourceOptionsDesc: string;
  imageExport: string;
  showAuthorName: string;
  showAuthorNameDesc: string;
  authorName: string;
  authorNameDesc: string;
  showBranding: string;
  showBrandingDesc: string;
  importHeading: string;
  importFromFlomo: string;
  importFromFlomoDesc: string;
  chooseHtmlFile: string;
  readingFile: string;                 // ${name}
  importSuccess: string;               // ${count}
  importNoNew: string;
  importFailed: string;                // ${err}

  // ── Stats ──
  months: string[];
  weekdays: string[];
  heatmapTooltip: (date: string, count: number) => string;
  statsTitle: string;
  statTotal: string;
  statStreak: string;
  statStreakUnit: string;
  statToday: string;
  statThisMonth: string;

  // ── Export ──
  saveAsPng: string;
  copyToClipboard: string;
  imageSaved: string;
  imageSavedTo: string;                // ${path}
  imageCopied: string;
  exportFailed: string;                // ${err}
  copyFailed: string;                  // ${err}

  // ── Canvas ──
  noMemosToExport: string;
  exportedToCanvas: string;            // ${count}

  // ── Flomo import ──
  noMemosInHtml: string;
}

const en: Messages = {
  openMemosView: "Open Memos view",
  quickCapture: "Quick capture",
  memoContentEmpty: "Memo content is empty.",
  memoSaved: "Memo saved!",
  saveAsMemo: "Save as Memo",
  selectionSavedAsMemo: "Selection saved as Memo!",

  memosTitle: "Memos",
  memoCount: (n) => `${n} memo${n !== 1 ? "s" : ""}`,
  newMemo: "New memo",
  randomReview: "Random review",
  sendToCanvas: "Send to Canvas",
  noMemosYet: "No memos yet. Start capturing your thoughts!",
  exportAsImage: "Export as image",

  searchImages: "Search image files…",
  searchNotes: "Search notes…",
  quickCaptureTitle: "Quick Capture",
  back: "Back",
  whatsOnYourMind: "What's on your mind?",
  mood: "Mood",
  source: "Source",
  insertImage: "Insert image",
  addTag: "Add tag",
  fixedTagHint: "Fixed tag: #${tag}",
  saveMemo: "Save Memo",
  addTagButton: "+ Add tag",
  tagPlaceholder: "Tag name…",
  memoEmpty: "Memo cannot be empty.",
  failedToSave: "Failed to save memo: ${err}",

  memosSettings: "Memos Settings",
  saveFolder: "Save folder",
  saveFolderDesc: "Folder where new memos are saved (relative to vault root).",
  useFixedTag: "Use fixed tag",
  useFixedTagDesc: "Automatically add a tag to every memo you capture.",
  fixedTagValue: "Fixed tag value",
  fixedTagValueDesc: "This tag will be added to every memo (without #).",
  extendedMetadata: "Extended metadata",
  enableMood: "Enable mood",
  enableMoodDesc: "Show mood picker when capturing memos. Adds a mood field to frontmatter for Dataview queries.",
  moodOptions: "Mood options",
  moodOptionsDesc: "Comma-separated emojis for the mood picker.",
  enableSource: "Enable source",
  enableSourceDesc: "Show source picker when capturing memos. Adds a source field to frontmatter for Dataview queries.",
  sourceOptions: "Source options",
  sourceOptionsDesc: "Comma-separated source labels (e.g. thought, kindle, web).",
  imageExport: "Image export",
  showAuthorName: "Show author name",
  showAuthorNameDesc: "Display your name at the bottom of exported memo images.",
  authorName: "Author name",
  authorNameDesc: "Your name or brand to show on exported images.",
  showBranding: "Show branding",
  showBrandingDesc: 'Display "Quick Memos for Obsidian" at the bottom of exported images.',
  importHeading: "Import",
  importFromFlomo: "Import from Flomo",
  importFromFlomoDesc: "Select the HTML file exported from Flomo. Each memo will be converted to a .md file with proper frontmatter and saved to the save folder. Duplicate imports are automatically skipped.",
  chooseHtmlFile: "Choose HTML file",
  readingFile: "Reading ${name}...",
  importSuccess: "Successfully imported ${count} memos from Flomo!",
  importNoNew: "No new memos to import (all already exist or file is empty).",
  importFailed: "Import failed: ${err}",

  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  heatmapTooltip: (date, count) => `${date}: ${count} memo${count !== 1 ? "s" : ""}`,
  statsTitle: "Stats",
  statTotal: "Total",
  statStreak: "Streak",
  statStreakUnit: "days",
  statToday: "Today",
  statThisMonth: "Month",

  saveAsPng: "Save as PNG",
  copyToClipboard: "Copy to clipboard",
  imageSaved: "Image saved!",
  imageSavedTo: "Image saved to ${path}",
  imageCopied: "Image copied to clipboard!",
  exportFailed: "Export failed: ${err}",
  copyFailed: "Copy failed: ${err}",

  noMemosToExport: "No memos to export.",
  exportedToCanvas: "Exported ${count} memos to Canvas!",

  noMemosInHtml: "No memos found in the HTML file.",
};

const zh: Messages = {
  openMemosView: "打开 Memos 视图",
  quickCapture: "快速记录",
  memoContentEmpty: "Memo 内容不能为空。",
  memoSaved: "Memo 已保存！",
  saveAsMemo: "保存为 Memo",
  selectionSavedAsMemo: "已保存为 Memo！",

  memosTitle: "Memos",
  memoCount: (n) => `${n} 条 memo`,
  newMemo: "新建 memo",
  randomReview: "随机回顾",
  sendToCanvas: "发送到 Canvas",
  noMemosYet: "还没有 memo，开始记录你的想法吧！",
  exportAsImage: "导出为图片",

  searchImages: "搜索图片文件…",
  searchNotes: "搜索笔记…",
  quickCaptureTitle: "快速记录",
  back: "返回",
  whatsOnYourMind: "此刻的想法…",
  mood: "心情",
  source: "来源",
  insertImage: "插入图片",
  addTag: "添加标签",
  fixedTagHint: "固定标签：#${tag}",
  saveMemo: "保存 Memo",
  addTagButton: "+ 添加标签",
  tagPlaceholder: "标签名…",
  memoEmpty: "Memo 不能为空。",
  failedToSave: "保存失败：${err}",

  memosSettings: "Memos 设置",
  saveFolder: "保存文件夹",
  saveFolderDesc: "新 memo 的保存位置（相对于 vault 根目录）。",
  useFixedTag: "使用固定标签",
  useFixedTagDesc: "自动为每条 memo 添加一个标签。",
  fixedTagValue: "固定标签值",
  fixedTagValueDesc: "自动添加的标签（不含 #）。",
  extendedMetadata: "扩展元数据",
  enableMood: "启用心情",
  enableMoodDesc: "记录时显示心情选择器，在 frontmatter 中添加 mood 字段，支持 Dataview 查询。",
  moodOptions: "心情选项",
  moodOptionsDesc: "逗号分隔的 emoji 列表。",
  enableSource: "启用来源",
  enableSourceDesc: "记录时显示来源选择器，在 frontmatter 中添加 source 字段，支持 Dataview 查询。",
  sourceOptions: "来源选项",
  sourceOptionsDesc: "逗号分隔的来源标签（如 thought、kindle、web）。",
  imageExport: "图片导出",
  showAuthorName: "显示作者名",
  showAuthorNameDesc: "在导出的 memo 图片底部显示你的名字。",
  authorName: "作者名",
  authorNameDesc: "显示在导出图片上的名字或品牌。",
  showBranding: "显示品牌标识",
  showBrandingDesc: "在导出图片底部显示「Quick Memos for Obsidian」。",
  importHeading: "导入",
  importFromFlomo: "从 Flomo 导入",
  importFromFlomoDesc: "选择从 Flomo 导出的 HTML 文件。每条 memo 会被转换为带 frontmatter 的 .md 文件并保存到指定文件夹。重复导入会自动跳过。",
  chooseHtmlFile: "选择 HTML 文件",
  readingFile: "正在读取 ${name}…",
  importSuccess: "成功从 Flomo 导入 ${count} 条 memo！",
  importNoNew: "没有新的 memo 可导入（全部已存在或文件为空）。",
  importFailed: "导入失败：${err}",

  months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  weekdays: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
  heatmapTooltip: (date, count) => `${date}：${count} 条 memo`,
  statsTitle: "统计",
  statTotal: "总计",
  statStreak: "连续",
  statStreakUnit: "天",
  statToday: "今日",
  statThisMonth: "本月",

  saveAsPng: "保存为 PNG",
  copyToClipboard: "复制到剪贴板",
  imageSaved: "图片已保存！",
  imageSavedTo: "图片已保存到 ${path}",
  imageCopied: "图片已复制到剪贴板！",
  exportFailed: "导出失败：${err}",
  copyFailed: "复制失败：${err}",

  noMemosToExport: "没有可导出的 memo。",
  exportedToCanvas: "已导出 ${count} 条 memo 到 Canvas！",

  noMemosInHtml: "HTML 文件中未找到 memo。",
};

/** Helper: simple template string replacement. */
export function t(key: string, vars?: Record<string, string | number>): string {
  let val = (i18n as unknown as Record<string, unknown>)[key];
  if (typeof val !== "string") return key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      val = val.replace(`\${${k}}`, String(v));
    }
  }
  return val;
}

function isChinese(): boolean {
  try {
    return getLanguage().startsWith("zh");
  } catch {
    return false;
  }
}

/** The active i18n messages object. */
export const i18n: Messages = isChinese() ? zh : en;
