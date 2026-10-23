import Link from "next/link";

export function NoStudent() {
  return (
    <div className="card soon-card">
      <b>아직 연결된 학생이 없어요</b>
      <p className="muted">학생이 만든 초대 코드를 입력하면 학습 현황을 볼 수 있어요.</p>
      <Link className="btn" href="/link">초대 코드 입력하기</Link>
    </div>
  );
}
