import Link from "next/link";

export function ComingSoon({ title, desc, phase }: { title: string; desc: string; phase: string }) {
  return (
    <>
      <header className="ph">
        <h1><span>{title}</span></h1>
        <p>{desc}</p>
      </header>
      <div className="card soon-card">
        <span className="bd">{phase}에 만들어요</span>
        <p className="muted">개발 계획서의 일정에 따라 이 화면을 추가할 예정이에요. 화면 구성과 동작은 공개된 프로토타입을 기준으로 옮깁니다.</p>
        <Link className="btn ghost" href="/dashboard">대시보드로 돌아가기</Link>
      </div>
    </>
  );
}
