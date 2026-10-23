"use client";

import { useActionState, useEffect, useState } from "react";
import { resetTimer, saveTimer, setPomodoro, setTimerSubject, toggleTimer } from "@/app/study-actions";
import { elapsedMs, fmtMinutes } from "@/lib/dates";
import { SUBJECTS, subjectColor } from "@/lib/subjects";
import type { FormState } from "@/lib/types";

interface Props {
  subject: string;
  startedAt: string | null;
  accMs: number;
  pomodoro: boolean;
  serverNow: number;
  savedToday: number; // 오늘 이미 기록된 분
  goal: number;
  readOnly: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function TimerClient(p: Props) {
  // 서버와 첫 렌더가 같도록 serverNow 로 시작하고, 마운트 뒤에 기기 시계와의 차이를 보정한다.
  const [now, setNow] = useState(p.serverNow);
  const [state, saveAction, saving] = useActionState<FormState, FormData>((prev) => saveTimer(prev), {});

  useEffect(() => {
    const skew = Date.now() - p.serverNow;
    setNow(Date.now() - skew);
    if (!p.startedAt) return;
    const id = setInterval(() => setNow(Date.now() - skew), 1000);
    return () => clearInterval(id);
  }, [p.startedAt, p.serverNow]);

  const el = elapsedMs(p.accMs, p.startedAt, now);
  const s = Math.floor(el / 1000);
  const total = p.savedToday + el / 60000;
  const prog = Math.min(1, total / p.goal);
  const C = 2 * Math.PI * 86;
  const running = !!p.startedAt;
  let phase = running ? `${p.subject} 공부 중` : p.accMs ? "일시정지" : "";
  if (p.pomodoro) {
    const pos = s % 1800;
    const focus = pos < 1500;
    const rem = focus ? 1500 - pos : 1800 - pos;
    phase = `${focus ? "집중" : "휴식"} ${pad(Math.floor(rem / 60))}:${pad(rem % 60)} 남음`;
  }

  return (
    <div className="card" style={{ textAlign: "center" }}>
      {!p.readOnly && (
        <div className="chips" style={{ justifyContent: "center", marginBottom: 10 }}>
          {SUBJECTS.map((x) => (
            <form key={x.name} action={setTimerSubject.bind(null, x.name)}>
              <button className="chip" aria-pressed={p.subject === x.name} disabled={running}>
                <i className="sw" style={{ ["--c" as string]: x.color }} />
                {x.name}
              </button>
            </form>
          ))}
        </div>
      )}
      <div style={{ position: "relative", width: 220, maxWidth: "100%", margin: "0 auto" }}>
        <svg className="ring" viewBox="0 0 200 200" width="220" height="220" role="img" aria-label={`오늘 목표 ${Math.round(prog * 100)}% 달성`}>
          <circle cx="100" cy="100" r="86" style={{ stroke: "var(--surface2)" }} />
          <circle
            cx="100" cy="100" r="86" transform="rotate(-90 100 100)" strokeLinecap="round"
            style={{ stroke: subjectColor(p.subject), strokeDasharray: C, strokeDashoffset: C * (1 - prog), transition: "stroke-dashoffset .4s" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div className="clock" aria-live="off">{pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}</div>
          <div className="sm muted">{phase}</div>
        </div>
      </div>
      <p style={{ marginTop: 8 }}>오늘 <b>{fmtMinutes(Math.floor(total))}</b> / 목표 <b>{fmtMinutes(p.goal)}</b></p>
      {!p.readOnly && (
        <>
          <div className="row" style={{ justifyContent: "center", marginTop: 10 }}>
            <form action={toggleTimer}>
              <button className="btn">{running ? "일시정지" : p.accMs ? "이어서 공부" : "공부 시작"}</button>
            </form>
            <form action={saveAction}>
              <button className="btn quiet" disabled={saving}>종료하고 기록</button>
            </form>
            <form action={resetTimer}>
              <button className="btn quiet">초기화</button>
            </form>
          </div>
          {state.error && <p className="err" role="alert" style={{ marginTop: 10 }}>{state.error}</p>}
          {state.message && <p className="okmsg" role="status" style={{ marginTop: 10 }}>{state.message}</p>}
          <form action={setPomodoro.bind(null, !p.pomodoro)} style={{ marginTop: 12 }}>
            <button className="linkbtn">{p.pomodoro ? "25분 집중·5분 휴식 표시 끄기" : "25분 집중·5분 휴식 표시 켜기"}</button>
          </form>
        </>
      )}
    </div>
  );
}
