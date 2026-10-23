export const SUBJECTS = [
  { name: "국어", color: "var(--s-kor)" },
  { name: "수학", color: "var(--s-math)" },
  { name: "영어", color: "var(--s-eng)" },
  { name: "과학", color: "var(--s-sci)" },
  { name: "사회", color: "var(--s-soc)" },
] as const;

export type SubjectName = (typeof SUBJECTS)[number]["name"];

export function subjectColor(name: string): string {
  return SUBJECTS.find((s) => s.name === name)?.color ?? "var(--accent)";
}

export function isSubject(name: string): name is SubjectName {
  return SUBJECTS.some((s) => s.name === name);
}
