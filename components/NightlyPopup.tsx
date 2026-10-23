"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildNightly, isNightlyTime, type DayStatus } from "@/lib/nightly";

/** 한국 시간 저녁 9시 이후 사이트를 열어 두면, 하루 한 번 남은 할 일(또는 입력 없음 경고)을 팝업으로 보여 준다. */
export function NightlyPopup({ status, date }: { status: DayStatus; date: string }) {
  const [open, setOpen] = useState(false);
  const nightly = buildNightly(status);
  const key = `gb_nightly_${date}`;

  useEffect(() => {
    function check() {
      if (!nightly || !isNightlyTime()) return;
      try {
        if (localStorage.getItem(key)) return;
      } catch {
        /* 저장소를 못 쓰면 매번 한 번씩만 보이게 둔다 */
      }
      setOpen(true);
    }
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, [nightly?.kind, key]); // eslint-disable-line react-hooks/exhaustive-deps

  function close() {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* 무시 */
    }
    setOpen(false);
  }

  if (!open || !nightly) return null;
  const warn = nightly.kind === "empty";
  return (
    <div className="modal-back" role="presentation">
      <div className={"modal" + (warn ? " warn" : "")} role="dialog" aria-modal="true" aria-labelledby="nightly-title">
        <h2 id="nightly-title" style={{ margin: 0 }}>{nightly.title}</h2>
        {nightly.kind === "todo" ? (
          <ul>
            {nightly.titles.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        ) : (
          <p>{nightly.body}</p>
        )}
        <div className="row">
          <Link className="btn" href={warn ? "/plan" : "/plan"} onClick={close}>{warn ? "계획 세우러 가기" : "계획 열기"}</Link>
          <button className="btn ghost" onClick={close}>나중에 할게요</button>
        </div>
      </div>
    </div>
  );
}
