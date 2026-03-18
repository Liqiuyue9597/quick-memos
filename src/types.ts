import { TFile } from "obsidian";

export interface MemoNote {
  file: TFile;
  content: string;  // body text (no frontmatter)
  tags: string[];   // merged frontmatter + inline #tags
  created: string;  // ISO datetime string
  dateLabel: string; // "YYYY-MM-DD" for grouping
  mood: string;     // mood emoji (or "")
  source: string;   // source label (or "")
}

export interface MemoStats {
  total: number;                    // total memo count
  streak: number;                   // consecutive days with memos
  today: number;                    // memos created today
  thisMonth: number;                // memos created this month
  dailyCounts: Map<string, number>; // dateLabel → count
}

export interface MemosSettings {
  saveFolder: string;        // default: "00-Inbox"
  useFixedTag: boolean;      // default: false
  fixedTag: string;          // default: ""
  statsCollapsed: boolean;   // default: false
  authorName: string;        // default: ""
  showAuthorInExport: boolean; // default: false
  showBrandingInExport: boolean; // default: true
  enableMood: boolean;       // default: false
  enableSource: boolean;     // default: false
  moodOptions: string[];     // default: ["💡", "🤔", "😊", "😤", "📖"]
  sourceOptions: string[];   // default: ["thought", "kindle", "web", "conversation", "podcast"]
}

export const DEFAULT_SETTINGS: MemosSettings = {
  saveFolder: "00-Inbox",
  useFixedTag: false,
  fixedTag: "",
  statsCollapsed: false,
  authorName: "",
  showAuthorInExport: false,
  showBrandingInExport: true,
  enableMood: false,
  enableSource: false,
  moodOptions: ["💡", "🤔", "😊", "😤", "📖"],
  sourceOptions: ["thought", "kindle", "web", "conversation", "podcast"],
};
