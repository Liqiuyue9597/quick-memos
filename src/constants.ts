export const VIEW_TYPE_MEMOS = "memos-view";
export const VIEW_TYPE_CAPTURE = "memos-capture-view";

// Shared tag regex — covers Latin, CJK (Chinese, Japanese, Korean), and common punctuation
export const INLINE_TAG_RE = /#([\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af/-]+)/g;
