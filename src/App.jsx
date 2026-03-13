import { useState, useEffect } from "react";

const STORAGE_KEY = "mj_health_logs";
const WEIGHT_KEY = "mj_weight_logs";

const defaultLog = () => ({
  date: new Date().toISOString().split("T")[0],
  protein: "", meals: "", exercise: null, exerciseType: "", sleep: "", sleepQuality: null, note: "",
});

function getTodayKey() { return new Date().toISOString().split("T")[0]; }

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

function getLastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function generateClaudeReport(logs, weights) {
  const last7 = getLastNDays(7);
  const weekLogs = last7.map(date => logs.find(l => l.date === date) || { date, empty: true });
  const weekWeights = weights.filter(w => last7.includes(w.date));
  const sleepLabels = ["개운함", "보통", "피곤함"];

  let text = `📊 주간 건강 리포트 (${formatDate(last7[0])} ~ ${formatDate(last7[6])})\n`;
  text += `${"─".repeat(38)}\n\n`;

  weekLogs.forEach(l => {
    text += `📅 ${formatDate(l.date)}\n`;
    if (l.empty) {
      text += `  • 기록 없음\n\n`;
    } else {
      text += `  • 단백질: ${l.protein ? l.protein + "g" : "미기록"}\n`;
      text += `  • 운동: ${l.exercise === true ? "✓ " + (l.exerciseType || "했음") : l.exercise === false ? "✗ 못함" : "미기록"}\n`;
      text += `  • 수면: ${l.sleep ? l.sleep + "시간" : "미기록"}${l.sleepQuality != null ? " (" + sleepLabels[l.sleepQuality] + ")" : ""}\n`;
      if (l.meals) text += `  • 식사: ${l.meals}\n`;
      if (l.note) text += `  • 메모: ${l.note}\n`;
      text += "\n";
    }
  });

  const recorded = weekLogs.filter(l => !l.empty);
  if (recorded.length > 0) {
    const proteinDays = recorded.filter(l => l.protein);
    const avgProtein = proteinDays.length ? (proteinDays.reduce((s, l) => s + Number(l.protein), 0) / proteinDays.length).toFixed(0) : "미기록";
    const exerciseDays = recorded.filter(l => l.exercise === true).length;
    const sleepDays = recorded.filter(l => l.sleep);
    const avgSleep = sleepDays.length ? (sleepDays.reduce((s, l) => s + Number(l.sleep), 0) / sleepDays.length).toFixed(1) : "미기록";
    text += `${"─".repeat(38)}\n📈 주간 요약\n`;
    text += `  • 평균 단백질: ${avgProtein}${avgProtein !== "미기록" ? "g / 목표 130g" : ""}\n`;
    text += `  • 운동 일수: ${exerciseDays}일 / 7일\n`;
    text += `  • 평균 수면: ${avgSleep}${avgSleep !== "미기록" ? "시간" : ""}\n`;
  }

  if (weekWeights.length > 0) {
    text += `\n⚖️ 이번 주 체중\n`;
    weekWeights.forEach(w => { text += `  • ${formatDate(w.date)}: ${w.val}kg\n`; });
    if (weights.length >= 2) {
      const total = (Number(weights[0].val) - Number(weights[weights.length - 1].val)).toFixed(1);
      text += `  • 누적 감량: ▼${total}kg\n`;
    }
  }
  return text;
}

function ProteinBar({ value }) {
  const target = 130;
  const pct = Math.min((value / target) * 100, 100);
  const color = pct >= 80 ? "#4ade80" : pct >= 50 ? "#facc15" : "#f87171";
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginBottom: 4 }}>
        <span>{value}g 섭취</span><span>목표 {target}g</span>
      </div>
      <div style={{ height: 6, background: "#2a2a2a", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function Tag({ active, onClick, children, color }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 99, border: "1px solid",
      borderColor: active ? color : "#333", background: active ? color + "22" : "transparent",
      color: active ? color : "#666", fontSize: 13, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit"
    }}>{children}</button>
  );
}

function TodayPanel({ log, onChange, onSave, saved }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <label style={{ fontSize: 11, letterSpacing: 2, color: "#666", textTransform: "uppercase" }}>단백질 섭취</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <input type="number" placeholder="0" value={log.protein} onChange={e => onChange({ ...log, protein: e.target.value })}
            style={{ width: 70, background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 22, fontWeight: 700, padding: "6px 10px", textAlign: "center", fontFamily: "inherit", outline: "none" }} />
          <span style={{ color: "#555", fontSize: 14 }}>g</span>
        </div>
        {log.protein && <ProteinBar value={Number(log.protein)} />}
      </div>

      <div>
        <label style={{ fontSize: 11, letterSpacing: 2, color: "#666", textTransform: "uppercase" }}>오늘 식사 메모</label>
        <textarea placeholder="ex) 점심 - 닭가슴살 샐러드, 저녁 - 단백질 쉐이크" value={log.meals}
          onChange={e => onChange({ ...log, meals: e.target.value })}
          style={{ marginTop: 8, width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, color: "#ccc", fontSize: 13, padding: "10px 12px", resize: "none", height: 72, fontFamily: "inherit", outline: "none", lineHeight: 1.6, boxSizing: "border-box" }} />
      </div>

      <div>
        <label style={{ fontSize: 11, letterSpacing: 2, color: "#666", textTransform: "uppercase" }}>운동</label>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <Tag active={log.exercise === true} onClick={() => onChange({ ...log, exercise: true })} color="#4ade80">✓ 했어요</Tag>
          <Tag active={log.exercise === false} onClick={() => onChange({ ...log, exercise: false })} color="#f87171">✗ 못했어요</Tag>
        </div>
        {log.exercise && (
          <input placeholder="운동 종류 (ex. 맨몸 근력 30분)" value={log.exerciseType}
            onChange={e => onChange({ ...log, exerciseType: e.target.value })}
            style={{ marginTop: 8, width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#ccc", fontSize: 13, padding: "8px 12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        )}
      </div>

      <div>
        <label style={{ fontSize: 11, letterSpacing: 2, color: "#666", textTransform: "uppercase" }}>수면</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <input type="number" step="0.5" placeholder="0" value={log.sleep}
            onChange={e => onChange({ ...log, sleep: e.target.value })}
            style={{ width: 70, background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 22, fontWeight: 700, padding: "6px 10px", textAlign: "center", fontFamily: "inherit", outline: "none" }} />
          <span style={{ color: "#555", fontSize: 14 }}>시간</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {["😴 개운해요", "😐 보통이에요", "😵 피곤해요"].map((s, i) => (
            <Tag key={i} active={log.sleepQuality === i} onClick={() => onChange({ ...log, sleepQuality: i })} color={["#4ade80", "#facc15", "#f87171"][i]}>{s}</Tag>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontSize: 11, letterSpacing: 2, color: "#666", textTransform: "uppercase" }}>한마디 메모</label>
        <input placeholder="오늘 컨디션이나 특이사항" value={log.note}
          onChange={e => onChange({ ...log, note: e.target.value })}
          style={{ marginTop: 8, width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#ccc", fontSize: 13, padding: "8px 12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
      </div>

      <button onClick={onSave} style={{
        background: saved ? "#1a3a1a" : "linear-gradient(135deg, #22c55e, #16a34a)",
        border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, padding: "14px",
        cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s", letterSpacing: 1
      }}>{saved ? "✓ 저장됨" : "오늘 기록 저장"}</button>
    </div>
  );
}

function WeightPanel({ weights, onAdd }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label style={{ fontSize: 11, letterSpacing: 2, color: "#666", textTransform: "uppercase" }}>체중 기록</label>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input type="number" step="0.1" placeholder="00.0" value={val} onChange={e => setVal(e.target.value)}
            style={{ flex: 1, background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 20, fontWeight: 700, padding: "8px 12px", fontFamily: "inherit", outline: "none" }} />
          <span style={{ color: "#555", fontSize: 14, alignSelf: "center" }}>kg</span>
          <button onClick={() => { if (val) { onAdd(val); setVal(""); } }}
            style={{ background: "#22c55e22", border: "1px solid #22c55e", borderRadius: 8, color: "#22c55e", fontSize: 13, padding: "0 16px", cursor: "pointer", fontFamily: "inherit" }}>추가</button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {weights.length === 0 && <p style={{ color: "#444", fontSize: 13 }}>아직 기록이 없어요</p>}
        {weights.slice().reverse().map((w, i) => {
          const prev = weights[weights.length - 2 - i];
          const diff = prev ? (Number(w.val) - Number(prev.val)).toFixed(1) : null;
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#141414", borderRadius: 10, padding: "10px 14px" }}>
              <span style={{ color: "#666", fontSize: 12 }}>{formatDate(w.date)}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {diff !== null && <span style={{ fontSize: 12, color: Number(diff) < 0 ? "#4ade80" : "#f87171" }}>{Number(diff) < 0 ? "▼" : "▲"} {Math.abs(diff)}kg</span>}
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{w.val}kg</span>
              </div>
            </div>
          );
        })}
      </div>
      {weights.length >= 2 && (() => {
        const total = (Number(weights[0].val) - Number(weights[weights.length - 1].val)).toFixed(1);
        return (
          <div style={{ background: "#0a2a0a", borderRadius: 12, padding: "14px 16px", border: "1px solid #1a4a1a" }}>
            <p style={{ color: "#666", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>누적 감량</p>
            <p style={{ color: "#4ade80", fontSize: 28, fontWeight: 900, margin: "4px 0 0" }}>▼ {total}kg</p>
          </div>
        );
      })()}
    </div>
  );
}

function HistoryPanel({ logs }) {
  if (logs.length === 0) return <p style={{ color: "#444", fontSize: 13 }}>아직 기록이 없어요</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[...logs].reverse().map((l, i) => (
        <div key={i} style={{ background: "#141414", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "#aaa", fontSize: 13 }}>{formatDate(l.date)}</span>
            <div style={{ display: "flex", gap: 6 }}>
              {l.exercise === true && <span style={{ fontSize: 11, background: "#22c55e22", color: "#4ade80", padding: "2px 8px", borderRadius: 99 }}>운동 ✓</span>}
              {l.exercise === false && <span style={{ fontSize: 11, background: "#f8717122", color: "#f87171", padding: "2px 8px", borderRadius: 99 }}>운동 ✗</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {l.protein && <span style={{ color: "#ccc", fontSize: 13 }}>🥩 단백질 <b style={{ color: "#fff" }}>{l.protein}g</b></span>}
            {l.sleep && <span style={{ color: "#ccc", fontSize: 13 }}>💤 수면 <b style={{ color: "#fff" }}>{l.sleep}h</b></span>}
          </div>
          {l.meals && <p style={{ color: "#666", fontSize: 12, marginTop: 6, marginBottom: 0 }}>{l.meals}</p>}
          {l.note && <p style={{ color: "#555", fontSize: 12, fontStyle: "italic", marginTop: 4, marginBottom: 0 }}>"{l.note}"</p>}
        </div>
      ))}
    </div>
  );
}

function ExportPanel({ logs, weights }) {
  const [copied, setCopied] = useState(false);
  const report = generateClaudeReport(logs, weights);

  const handleCopy = () => {
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = report;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#0d1a0d", border: "1px solid #1a3a1a", borderRadius: 14, padding: "16px" }}>
        <p style={{ color: "#4ade80", fontSize: 13, fontWeight: 700, margin: "0 0 6px" }}>📋 Claude에게 보내는 방법</p>
        <p style={{ color: "#666", fontSize: 12, margin: 0, lineHeight: 1.8 }}>
          1. 아래 버튼으로 복사<br />
          2. Claude 채팅창에 붙여넣기<br />
          3. 매주 일요일에 보내면 좋아요 😄
        </p>
      </div>
      <pre style={{
        background: "#141414", border: "1px solid #222", borderRadius: 12,
        padding: "16px", fontSize: 12, color: "#aaa", lineHeight: 1.8,
        whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
        maxHeight: 340, overflowY: "auto"
      }}>{report}</pre>
      <button onClick={handleCopy} style={{
        background: copied ? "#1a3a1a" : "linear-gradient(135deg, #facc15, #d97706)",
        border: "none", borderRadius: 12, color: copied ? "#4ade80" : "#000",
        fontSize: 15, fontWeight: 700, padding: "14px", cursor: "pointer",
        fontFamily: "inherit", transition: "all 0.3s"
      }}>
        {copied ? "✓ 복사 완료! Claude에 붙여넣기 하세요" : "📋 주간 리포트 복사하기"}
      </button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("today");
  const [log, setLog] = useState(defaultLog());
  const [logs, setLogs] = useState([]);
  const [weights, setWeights] = useState([]);
  const [saved, setSaved] = useState(false);
  const [notifStatus, setNotifStatus] = useState("default");

  useEffect(() => {
    try {
      const r = localStorage.getItem(STORAGE_KEY);
      if (r) setLogs(JSON.parse(r));
      const w = localStorage.getItem(WEIGHT_KEY);
      if (w) setWeights(JSON.parse(w));
    } catch {}
    if ('Notification' in window) setNotifStatus(Notification.permission);
  }, []);

  const requestNotification = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifStatus(permission);
    if (permission === 'granted') {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: 'SCHEDULE_NOTIFICATION' });
    }
  };

  const saveLog = () => {
    const today = getTodayKey();
    const updated = logs.filter(l => l.date !== today).concat({ ...log, date: today });
    setLogs(updated);
    setSaved(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setTimeout(() => setSaved(false), 2000);
  };

  const addWeight = (val) => {
    const updated = [...weights, { date: getTodayKey(), val }];
    setWeights(updated);
    localStorage.setItem(WEIGHT_KEY, JSON.stringify(updated));
  };

  const tabs = [
    { id: "today", label: "오늘" },
    { id: "weight", label: "체중" },
    { id: "history", label: "기록" },
    { id: "export", label: "📤" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", color: "#fff", fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif", padding: "0 0 60px" }}>
      <div style={{ padding: "32px 24px 0", borderBottom: "1px solid #1a1a1a" }}>
        <span style={{ fontSize: 10, letterSpacing: 3, color: "#444", textTransform: "uppercase" }}>마운자로 다이어트</span>
        <h1 style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 900, letterSpacing: -1 }}>건강 트래커</h1>
        <p style={{ color: "#444", fontSize: 12, marginTop: 4 }}>{formatDate(getTodayKey())}</p>
        {notifStatus !== "granted" && (
          <button onClick={requestNotification} style={{
            marginTop: 12, width: "100%", background: "#1a1a00", border: "1px solid #facc1566",
            borderRadius: 10, color: "#facc15", fontSize: 12, padding: "10px",
            cursor: "pointer", fontFamily: "inherit", textAlign: "left"
          }}>
            🔔 저녁 9시 알림 받기 {notifStatus === "denied" ? "(설정에서 허용 필요)" : "→ 탭해서 허용"}
          </button>
        )}
        {notifStatus === "granted" && (
          <div style={{ marginTop: 12, background: "#0a2a0a", border: "1px solid #1a4a1a", borderRadius: 10, padding: "8px 12px" }}>
            <span style={{ color: "#4ade80", fontSize: 12 }}>🔔 저녁 9시 알림 설정됨 ✓</span>
          </div>
        )}
        <div style={{ display: "flex", marginTop: 24 }}>
          {tabs.map(t => {
            const isExport = t.id === "export";
            const activeColor = isExport ? "#facc15" : "#22c55e";
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, background: "none", border: "none",
                color: tab === t.id ? activeColor : "#555",
                fontSize: isExport ? 16 : 13, fontWeight: tab === t.id ? 700 : 400,
                padding: "10px 0", cursor: "pointer",
                borderBottom: `2px solid ${tab === t.id ? activeColor : "transparent"}`,
                transition: "all 0.2s", fontFamily: "inherit"
              }}>{t.label}</button>
            );
          })}
        </div>
      </div>
      <div style={{ padding: "28px 24px" }}>
        {tab === "today" && <TodayPanel log={log} onChange={setLog} onSave={saveLog} saved={saved} />}
        {tab === "weight" && <WeightPanel weights={weights} onAdd={addWeight} />}
        {tab === "history" && <HistoryPanel logs={logs} />}
        {tab === "export" && <ExportPanel logs={logs} weights={weights} />}
      </div>
    </div>
  );
}
