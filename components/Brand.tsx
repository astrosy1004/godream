export function Brand() {
  return (
    <div className="brand">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="16" fill="none" style={{ stroke: "var(--red)" }} strokeWidth="3" strokeLinecap="round" strokeDasharray="86 16" transform="rotate(-30 20 20)" />
        <path d="M12 21l6 6 11-14" fill="none" style={{ stroke: "var(--accent)" }} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <b>공부길</b>
        <small>중·고등 학습 관리</small>
      </div>
    </div>
  );
}
