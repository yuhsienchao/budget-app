// lib/budget.js
export const DAILY_BUDGET = 360;
export const MONTHLY_RESERVE = 1000;
export const START_DATE = "2026-06-15";
export const CLAUDE_DAILY = Math.round((200 * 32) / 365 * 100) / 100;
export const CLAUDE_START = "2026-06-16";
export const CLAUDE_END = "2027-06-15";

export function getFixedExpenses(dateStr) {
  if (dateStr >= CLAUDE_START && dateStr <= CLAUDE_END) {
    return [{ desc: "Claude 訂閱（攤提）", amount: CLAUDE_DAILY, fixed: true }];
  }
  return [];
}

export function computeCumulative(days, upToDate) {
  const recordedDays = Object.keys(days)
    .filter(d => d >= START_DATE && d < upToDate)
    .sort();

  let cumulative = 0;
  const monthsAdded = new Set();

  for (const d of recordedDays) {
    const month = d.slice(0, 7);
    if (!monthsAdded.has(month)) {
      cumulative += MONTHLY_RESERVE;
      monthsAdded.add(month);
    }
    const userExp = (days[d]?.expenses || []).reduce((s, e) => s + e.amount, 0);
    const fixed = getFixedExpenses(d).reduce((s, e) => s + e.amount, 0);
    cumulative += DAILY_BUDGET - userExp - fixed;
  }

  const upToMonth = upToDate.slice(0, 7);
  if (!monthsAdded.has(upToMonth)) {
    cumulative += MONTHLY_RESERVE;
  }

  return Math.round(cumulative * 100) / 100;
}
