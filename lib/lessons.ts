import { isSubject } from "./subjects";

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface LessonInput {
  subject: string;
  lesson_on: string;
  title: string;
  summary: string;
  homework: string;
  next_questions: string;
}

/** 폼 값을 검사한다. 통과하면 value, 아니면 사용자에게 보여 줄 error 를 돌려준다. */
export function parseLesson(get: (key: string) => string): { value: LessonInput } | { error: string } {
  const v: LessonInput = {
    subject: get("subject").trim(),
    lesson_on: get("lesson_on").trim(),
    title: get("title").trim(),
    summary: get("summary").trim(),
    homework: get("homework").trim(),
    next_questions: get("next_questions").trim(),
  };
  if (!isSubject(v.subject)) return { error: "과목을 선택해 주세요." };
  if (!DATE_RE.test(v.lesson_on) || Number.isNaN(Date.parse(v.lesson_on))) return { error: "수업 날짜를 선택해 주세요." };
  if (!v.title || v.title.length > 120) return { error: "제목을 1~120자로 입력해 주세요." };
  if (v.summary.length > 4000) return { error: "핵심 정리는 4000자 이내로 써 주세요." };
  if (v.homework.length > 1000) return { error: "숙제는 1000자 이내로 써 주세요." };
  if (v.next_questions.length > 1000) return { error: "다음 수업 질문은 1000자 이내로 써 주세요." };
  if (!v.summary && !v.homework && !v.next_questions) return { error: "핵심 정리, 숙제, 질문 중 하나는 적어 주세요." };
  return { value: v };
}
