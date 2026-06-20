"use client";
import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  DAILY_BUDGET, MONTHLY_RESERVE, START_DATE,
  getFixedExpenses, computeCumulative
} from "../lib/budget";

const DOC_REF = () => doc(db, "budget", "judy");
const PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || "judy2026";

function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  function handleLogin() {
    if (pw === PASSWORD) {
      sessionStorage.setItem("budget_auth", "1");
      onLogin();
    } else {
      setError(true);
      setPw("");
    }
  }

  return (
    <div style={{ background: "#0f1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#1a1d2e", borderRadius: 16, padding: 32, width: "100%", maxWidth: 360, border: "1px solid #2a2d3e" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>💰</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#e8eaf0" }}>每日記帳</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>請輸入密碼</div>
        </div>
        <input
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          placeholder="密碼"
          autoFocus
          style={{
            width: "100%", background: "#0f1117", border: `1px solid ${error ? "#f87171" : "#2a2d3e"}`,
            borderRadius: 8, color: "#e8eaf0", padding: "12px 14px", fontSize: 16,
            marginBottom: 8, boxSizing: "border-box"
          }}
        />
        {error && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>密碼錯誤，請再試一次</div>}
        <button onClick={handleLogin} style={{
          width: "100%", background: "linear-gradient(135deg,#818cf8,#6366f1)", border: "none",
          borderRadius: 8, color: "#fff", padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer"
        }}>登入</button>
      </div>
    </div>
  );
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Small UI atoms ──────────────────────────────────────────
function StatCard({ label, value, sub, accent, span }) {
  return (
    <div style={{
      background: "#12151f", borderRadius: 10, padding: "11px 13px",
      border: `1px solid ${accent}33`, gridColumn: span ? "1 / -1" : undefined
    }}>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent }}>{value}</div>
      <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Btn({ onClick, color, children, style }) {
  return (
    <button onClick={onClick} style={{
      background: `${color}22`, border: `1px solid ${color}55`, borderRadius: 6,
      color, padding: "4px 8px", fontSize: 12, fontWeight: 700, flexShrink: 0, ...style
    }}>{children}</button>
  );
}

// ── Main App ────────────────────────────────────────────────
export default function BudgetApp() {
  const [authed, setAuthed] = useState(false);
  const [days, setDays] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [tab, setTab] = useState("today");
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [notifText, setNotifText] = useState("");

  // Check auth
  useEffect(() => {
    if (sessionStorage.getItem("budget_auth") === "1") setAuthed(true);
  }, []);

  // Load from Firebase
  useEffect(() => {
    getDoc(DOC_REF()).then(snap => {
      if (snap.exists()) setDays(snap.data().days || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Save to Firebase
  const save = useCallback(async (newDays) => {
    setSaving(true);
    try {
      await setDoc(DOC_REF(), { days: newDays });
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }, []);

  function updateDays(newDays) {
    setDays(newDays);
    save(newDays);
  }

  // ── Derived values ──
  const userExpenses = days[selectedDate]?.expenses || [];
  const fixedExpenses = getFixedExpenses(selectedDate);
  const allExpenses = [...userExpenses, ...fixedExpenses];
  const totalToday = allExpenses.reduce((s, e) => s + e.amount, 0);
  const remainToday = DAILY_BUDGET - totalToday;
  const cumulative = computeCumulative(days, selectedDate);
  const cumulativeAfterToday = Math.round((cumulative + remainToday) * 100) / 100;

  // ── CRUD ──
  function addExpense() {
    const amt = parseFloat(newAmount);
    if (!newDesc.trim() || isNaN(amt) || amt <= 0) return;
    const prev = days[selectedDate]?.expenses || [];
    const newDays = { ...days, [selectedDate]: { expenses: [...prev, { desc: newDesc.trim(), amount: amt }] } };
    updateDays(newDays);
    setNewDesc(""); setNewAmount("");
  }

  function deleteExpense(idx) {
    const prev = days[selectedDate]?.expenses || [];
    const newDays = { ...days, [selectedDate]: { expenses: prev.filter((_, i) => i !== idx) } };
    updateDays(newDays);
  }

  function startEdit(idx) {
    setEditIdx(idx);
    setEditDesc(userExpenses[idx].desc);
    setEditAmount(String(userExpenses[idx].amount));
  }

  function saveEdit() {
    const amt = parseFloat(editAmount);
    if (!editDesc.trim() || isNaN(amt)) return;
    const prev = days[selectedDate]?.expenses || [];
    const newDays = { ...days, [selectedDate]: { expenses: prev.map((e, i) => i === editIdx ? { desc: editDesc.trim(), amount: amt } : e) } };
    updateDays(newDays);
    setEditIdx(null);
  }

  // ── Notification ──
  function buildNotifText(dateStr) {
    const uExp = days[dateStr]?.expenses || [];
    const fExp = getFixedExpenses(dateStr);
    const all = [...uExp, ...fExp];
    const total = all.reduce((s, e) => s + e.amount, 0);
    const remain = DAILY_BUDGET - total;
    const cum = computeCumulative(days, dateStr);
    const cumAfter = Math.round((cum + remain) * 100) / 100;
    return [
      `📅 ${dateStr} 日結算`,
      ``,
      `💸 今日花費：$${Math.round(total).toLocaleString()}`,
      ...all.map(e => `  • ${e.desc}：$${e.amount}${e.fixed ? "（固定）" : ""}`),
      ``,
      `📊 今日預算剩餘：${remain >= 0 ? "+" : ""}$${Math.round(remain).toLocaleString()} / $${DAILY_BUDGET}`,
      `🏦 累計預算結餘：$${Math.round(cumAfter).toLocaleString()}`,
      ``,
      remain >= 0 ? `✅ 今天控制得不錯！` : `⚠️ 今天超支 $${Math.abs(Math.round(remain)).toLocaleString()}`
    ].join("\n");
  }

  const allDayKeys = Object.keys(days).filter(d => d >= START_DATE).sort().reverse();

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  if (loading) return (
    <div style={{ background: "#0f1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#818cf8", fontSize: 16 }}>
      載入中…
    </div>
  );

  return (
    <div style={{ background: "#0f1117", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a1d2e,#12151f)", borderBottom: "1px solid #2a2d3e", padding: "18px 16px 0", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>💰</span>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>每日記帳</div>
                <div style={{ fontSize: 10, color: "#6b7280" }}>Daily Budget Tracker</div>
              </div>
            </div>
            {saving && <span style={{ fontSize: 11, color: "#818cf8" }}>儲存中…</span>}
          </div>
          <div style={{ display: "flex" }}>
            {[["today", "今日記帳"], ["history", "歷史紀錄"]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                flex: 1, padding: "9px 0", background: "none", border: "none",
                color: tab === k ? "#818cf8" : "#6b7280", fontWeight: tab === k ? 700 : 400,
                borderBottom: tab === k ? "2px solid #818cf8" : "2px solid transparent", fontSize: 14
              }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 14px 80px" }}>
        {tab === "today" && <>
          {/* Date */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ color: "#6b7280", fontSize: 12 }}>日期</span>
            <input type="date" value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setEditIdx(null); }}
              style={{ background: "#1a1d2e", border: "1px solid #2a2d3e", borderRadius: 8, color: "#e8eaf0", padding: "6px 10px", fontSize: 14 }} />
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <StatCard label="今日花費" value={`$${Math.round(totalToday).toLocaleString()}`} sub={`預算 $${DAILY_BUDGET}`} accent="#f87171" />
            <StatCard label="今日剩餘" value={`$${Math.round(remainToday).toLocaleString()}`}
              sub={remainToday >= 0 ? "✅ 未超支" : "⚠️ 超支"} accent={remainToday >= 0 ? "#34d399" : "#f87171"} />
            <StatCard label="累計結餘（今日前）" value={`$${Math.round(cumulative).toLocaleString()}`} sub="不含今天" accent="#818cf8" span />
            <StatCard label="累計結餘（含今日）" value={`$${Math.round(cumulativeAfterToday).toLocaleString()}`}
              sub="今日結算後預估" accent={cumulativeAfterToday >= 0 ? "#fbbf24" : "#f87171"} span />
          </div>

          {/* Fixed expenses */}
          {fixedExpenses.length > 0 && (
            <div style={{ background: "#1a1d2e", borderRadius: 10, padding: "8px 12px", marginBottom: 10, border: "1px solid #818cf844", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#818cf8" }}>🔒 固定攤提：{fixedExpenses.map(e => `${e.desc} $${e.amount}`).join("、")}</span>
            </div>
          )}

          {/* Expense list */}
          <div style={{ background: "#1a1d2e", borderRadius: 12, padding: 12, marginBottom: 12, border: "1px solid #2a2d3e" }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10, fontWeight: 600 }}>支出明細</div>
            {userExpenses.length === 0 && (
              <div style={{ color: "#374151", fontSize: 13, textAlign: "center", padding: "10px 0" }}>尚無手動記錄</div>
            )}
            {userExpenses.map((e, i) => (
              <div key={i} style={{ marginBottom: 7 }}>
                {editIdx === i ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input value={editDesc} onChange={ev => setEditDesc(ev.target.value)}
                      style={{ flex: 2, background: "#0f1117", border: "1px solid #818cf8", borderRadius: 6, color: "#e8eaf0", padding: "5px 8px", fontSize: 13 }} />
                    <input value={editAmount} type="number" onChange={ev => setEditAmount(ev.target.value)}
                      style={{ flex: 1, background: "#0f1117", border: "1px solid #818cf8", borderRadius: 6, color: "#e8eaf0", padding: "5px 8px", fontSize: 13 }} />
                    <Btn onClick={saveEdit} color="#34d399">✓</Btn>
                    <Btn onClick={() => setEditIdx(null)} color="#6b7280">✕</Btn>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ flex: 2, fontSize: 14 }}>{e.desc}</span>
                    <span style={{ flex: 1, textAlign: "right", fontSize: 14, color: "#fbbf24", fontWeight: 600 }}>${e.amount}</span>
                    <Btn onClick={() => startEdit(i)} color="#818cf8">✎</Btn>
                    <Btn onClick={() => deleteExpense(i)} color="#f87171">✕</Btn>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add expense */}
          <div style={{ background: "#1a1d2e", borderRadius: 12, padding: 12, marginBottom: 12, border: "1px solid #2a2d3e" }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10, fontWeight: 600 }}>新增支出</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input placeholder="項目名稱" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addExpense()}
                style={{ flex: 2, background: "#0f1117", border: "1px solid #2a2d3e", borderRadius: 8, color: "#e8eaf0", padding: "8px 10px", fontSize: 14 }} />
              <input placeholder="金額" value={newAmount} type="number" onChange={e => setNewAmount(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addExpense()}
                style={{ flex: 1, background: "#0f1117", border: "1px solid #2a2d3e", borderRadius: 8, color: "#e8eaf0", padding: "8px 10px", fontSize: 14 }} />
            </div>
            <button onClick={addExpense} style={{
              width: "100%", background: "linear-gradient(135deg,#818cf8,#6366f1)", border: "none", borderRadius: 8,
              color: "#fff", padding: "10px 0", fontSize: 14, fontWeight: 700
            }}>＋ 新增</button>
          </div>

          {/* Preview notify */}
          <button onClick={() => { setNotifText(buildNotifText(selectedDate)); setShowNotif(true); }} style={{
            width: "100%", background: "#1a1d2e", border: "1px solid #2a2d3e", borderRadius: 10,
            color: "#e8eaf0", padding: "11px 0", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}>📲 預覽 LINE 晚間通知</button>
        </>}

        {tab === "history" && (
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>共 {allDayKeys.length} 天有記錄</div>
            {allDayKeys.map(d => {
              const uExp = days[d]?.expenses || [];
              const fExp = getFixedExpenses(d);
              const all = [...uExp, ...fExp];
              const total = all.reduce((s, e) => s + e.amount, 0);
              const rem = DAILY_BUDGET - total;
              return (
                <div key={d} style={{ background: "#1a1d2e", borderRadius: 10, padding: 12, marginBottom: 10, border: "1px solid #2a2d3e" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{d}</span>
                    <span style={{ fontSize: 13, color: rem >= 0 ? "#34d399" : "#f87171", fontWeight: 600 }}>
                      {rem >= 0 ? `剩 $${Math.round(rem)}` : `超支 $${Math.round(Math.abs(rem))}`}
                    </span>
                  </div>
                  {uExp.map((e, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#9ca3af", paddingLeft: 6 }}>
                      <span>{e.desc}</span><span>${e.amount}</span>
                    </div>
                  ))}
                  {fExp.map((e, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#818cf8", paddingLeft: 6 }}>
                      <span>🔒 {e.desc}</span><span>${e.amount}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid #2a2d3e", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#6b7280" }}>合計</span>
                    <span style={{ color: "#fbbf24", fontWeight: 700 }}>${Math.round(total)}</span>
                  </div>
                  <button onClick={() => { setSelectedDate(d); setTab("today"); setEditIdx(null); }} style={{
                    marginTop: 6, width: "100%", background: "#0f1117", border: "none", borderRadius: 6,
                    color: "#818cf8", padding: "5px 0", fontSize: 12
                  }}>✎ 編輯這天</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notification modal */}
      {showNotif && (
        <div onClick={() => setShowNotif(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 480
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, background: "#06c755", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💬</div>
              <div>
                <div style={{ fontWeight: 700, color: "#111", fontSize: 15 }}>LINE 通知預覽</div>
                <div style={{ fontSize: 11, color: "#999" }}>23:55 · 每日結算</div>
              </div>
            </div>
            <div style={{ background: "#f0f0f0", borderRadius: 12, padding: 14, fontSize: 14, color: "#222", whiteSpace: "pre-wrap", lineHeight: 1.8, fontFamily: "monospace" }}>
              {notifText}
            </div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 10, textAlign: "center" }}>點擊背景關閉</div>
          </div>
        </div>
      )}
    </div>
  );
}
