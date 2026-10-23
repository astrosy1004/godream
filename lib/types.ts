export type Role = "student" | "guardian" | "teacher";

export interface Profile {
  id: string;
  role: Role;
  name: string;
  grade: string | null;
  goal_minutes: number;
}

export interface PlanTask {
  id: string;
  student_id: string;
  task_date: string;
  subject: string;
  title: string;
  minutes: number;
  done_at: string | null;
}

export interface StudySession {
  id: string;
  student_id: string;
  subject: string;
  minutes: number;
  studied_on: string;
}

export interface LessonNote {
  id: string;
  student_id: string;
  author_id: string;
  subject: string;
  lesson_on: string;
  title: string;
  summary: string;
  homework: string;
  next_questions: string;
  homework_done_at: string | null;
  author: { name: string } | null;
}

export interface FeedbackRow {
  id: string;
  student_id: string;
  author_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
  author: { name: string; role: Role } | null;
}

export interface WrongNote {
  id: string;
  student_id: string;
  subject: string;
  unit: string;
  question_text: string;
  my_answer: string;
  correct_answer: string;
  reason: string;
  memo: string;
  image_path: string | null;
  ai_analysis: import("@/lib/wrong").WrongAnalysis | null;
  analyzed_at: string | null;
  review_count: number;
  next_review_on: string | null;
  mastered_at: string | null;
  created_at: string;
}

export interface ExamScope {
  id: string;
  student_id: string;
  subject: string;
  title: string;
  exam_on: string | null;
  scope_text: string;
  image_paths: string[];
  ai_plan: import("@/lib/exam").ExamPlan | null;
  analyzed_at: string | null;
  plan_added_at: string | null;
  created_at: string;
}

export interface MockTest {
  id: string;
  student_id: string;
  subject: string;
  title: string;
  questions: import("@/lib/mock").MockQuestion[];
  answers: (string | null)[] | null;
  score: number | null;
  total: number;
  taken_at: string | null;
  created_at: string;
}

export interface TimerRow {
  student_id: string;
  subject: string;
  started_at: string | null;
  acc_ms: number;
  pomodoro: boolean;
}

export interface LinkedMember {
  id: string; // links.id
  relation: "guardian" | "teacher";
  member: { id: string; name: string } | null;
}

export interface LinkedStudent {
  id: string; // links.id
  relation: "guardian" | "teacher";
  student: Profile | null;
}

export const ROLE_LABEL: Record<Role, string> = {
  student: "학생",
  guardian: "학부모",
  teacher: "선생님",
};

export interface FormState {
  error?: string;
  message?: string;
  code?: string;
}
