import { setIcon } from "obsidian";
import { MemoNote, MemoStats } from "./types";
import { i18n } from "./i18n";

/**
 * Pure function: compute statistics from an array of memos.
 */
export function computeStats(memos: MemoNote[]): MemoStats {
  const dailyCounts = new Map<string, number>();
  for (const memo of memos) {
    dailyCounts.set(memo.dateLabel, (dailyCounts.get(memo.dateLabel) ?? 0) + 1);
  }

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const todayLabel = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const monthPrefix = todayLabel.slice(0, 7); // "YYYY-MM"

  const total = memos.length;
  const today = dailyCounts.get(todayLabel) ?? 0;

  let thisMonth = 0;
  for (const [label, count] of dailyCounts) {
    if (label.startsWith(monthPrefix)) {
      thisMonth += count;
    }
  }

  // Streak: count consecutive days with memos, starting from today or yesterday
  const streak = computeStreak(dailyCounts, todayLabel);

  return { total, streak, today, thisMonth, dailyCounts };
}

export function computeStreak(dailyCounts: Map<string, number>, todayLabel: string): number {
  const todayDate = new Date(todayLabel + "T00:00:00");
  // Start from today if it has memos, otherwise from yesterday
  let startOffset = dailyCounts.has(todayLabel) ? 0 : 1;
  let streak = 0;

  for (let i = startOffset; ; i++) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const label = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    if (dailyCounts.has(label)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get the level (0-4) for a given count.
 */
export function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

/**
 * Render the heatmap grid: 7 rows (Mon-Sun) x 17 columns (weeks).
 * GitHub-style with weekday labels, month labels, and color legend.
 * Uses CSS grid with grid-auto-flow: column so we emit cells column-by-column.
 */
export function renderHeatmap(
  container: HTMLElement,
  dailyCounts: Map<string, number>,
  onDateClick: (date: string) => void
) {
  const MONTHS = i18n.months;
  const WEEKDAYS = i18n.weekdays;

  const wrap = container.createDiv("memos-heatmap-wrap");

  // --- Weekday labels (left side) ---
  const weekdayLabels = wrap.createDiv("memos-heatmap-weekday-labels");
  // Empty spacer to align with month label row
  weekdayLabels.createDiv("memos-heatmap-weekday-spacer");
  for (let dow = 0; dow < 7; dow++) {
    const lbl = weekdayLabels.createDiv("memos-heatmap-weekday-label");
    // Only show Mon, Wed, Fri
    if (dow === 0 || dow === 2 || dow === 4) {
      lbl.textContent = WEEKDAYS[dow];
    }
  }

  // --- Grid area (month labels + heatmap cells) ---
  const gridArea = wrap.createDiv("memos-heatmap-grid-area");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the start date: go back 16 weeks from the start of the current week (Monday)
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - mondayOffset);

  const startDate = new Date(thisMonday);
  startDate.setDate(startDate.getDate() - 16 * 7);

  const pad = (n: number) => n.toString().padStart(2, "0");

  // --- Month labels row ---
  const monthRow = gridArea.createDiv("memos-heatmap-month-labels");
  let prevMonth = -1;
  for (let week = 0; week < 17; week++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + week * 7);
    const month = d.getMonth();
    const monthLabel = monthRow.createDiv("memos-heatmap-month-label");
    if (month !== prevMonth) {
      monthLabel.textContent = MONTHS[month];
      prevMonth = month;
    }
  }

  // --- Heatmap grid ---
  const heatmap = gridArea.createDiv("memos-heatmap");

  // Render column by column (CSS grid-auto-flow: column handles placement)
  for (let week = 0; week < 17; week++) {
    for (let dow = 0; dow < 7; dow++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + week * 7 + dow);

      const label = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const count = dailyCounts.get(label) ?? 0;
      const level = getLevel(count);

      // Don't render future dates
      if (d > today) {
        heatmap.createDiv("memos-heatmap-cell memos-heatmap-empty");
        continue;
      }

      const cell = heatmap.createDiv({
        cls: `memos-heatmap-cell memos-heatmap-level-${level}`,
        attr: {
          "data-tooltip": i18n.heatmapTooltip(label, count),
          "data-date": label,
        },
      });

      if (count > 0) {
        cell.addEventListener("click", () => {
          onDateClick(label);
        });
      }
    }
  }

}

/**
 * Render the full stats section: header (with collapse toggle) + heatmap + stat numbers.
 */
export function renderStatsSection(
  container: HTMLElement,
  stats: MemoStats,
  collapsed: boolean,
  callbacks: {
    onToggle: () => void;
    onDateClick: (date: string) => void;
  }
) {
  const section = container.createDiv("memos-stats-section");

  // Header row with collapse toggle
  const header = section.createDiv("memos-stats-header");
  const chevron = header.createSpan("memos-stats-chevron");
  setIcon(chevron, collapsed ? "chevron-right" : "chevron-down");
  header.createSpan({ cls: "memos-stats-title", text: i18n.statsTitle });

  header.addEventListener("click", () => {
    callbacks.onToggle();
  });

  // Collapsible content
  const content = section.createDiv({
    cls: `memos-stats-content${collapsed ? " memos-stats-collapsed" : ""}`,
  });

  if (!collapsed) {
    // Heatmap
    renderHeatmap(content, stats.dailyCounts, callbacks.onDateClick);

    // Stat numbers
    const numbers = content.createDiv("memos-stats-numbers");
    renderStatCard(numbers, i18n.statTotal, String(stats.total));
    renderStatCard(numbers, i18n.statStreak, String(stats.streak), i18n.statStreakUnit);
    renderStatCard(numbers, i18n.statToday, String(stats.today));
    renderStatCard(numbers, i18n.statThisMonth, String(stats.thisMonth));
  }
}

function renderStatCard(container: HTMLElement, label: string, value: string, unit?: string) {
  const card = container.createDiv("memos-stat-card");
  const valueEl = card.createDiv("memos-stat-value");
  valueEl.createSpan({ text: value });
  if (unit) {
    valueEl.createSpan({ cls: "memos-stat-unit", text: ` ${unit}` });
  }
  card.createDiv({ cls: "memos-stat-label", text: label });
}
