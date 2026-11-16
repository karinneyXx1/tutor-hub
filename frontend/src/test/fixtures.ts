// Тестовые данные в точном формате ответов API (backend/app/schemas.py: UserOut, LoginOut, HomeworkOut).
import type { Homework, LoginResponse, User } from '@/lib/api'
import { todayISO } from '@/lib/validation'

export const API = 'http://localhost:8000'

/** Дата через `days` дней от сегодня, YYYY-MM-DD. */
export const inDays = (days: number) => todayISO(new Date(Date.now() + days * 86_400_000))

export const tutor: User = { id: 1, email: 'tutor@example.com', name: 'Мария Иванова', role: 'tutor' }
export const studentUser: User = { id: 2, email: 'anna@example.com', name: 'Анна Смирнова', role: 'student' }

export const students: User[] = [
  studentUser,
  { id: 3, email: 'ivan@example.com', name: 'Иван Петров', role: 'student' },
]

export const loginResponse: LoginResponse = { token: 'test-token', user: tutor }

export function makeHomework(overrides: Partial<Homework> = {}): Homework {
  return {
    id: 10,
    tutor_id: 1,
    student_id: 2,
    student_name: 'Анна Смирнова',
    title: 'Списки и словари',
    description: '',
    due_date: inDays(3),
    status: 'assigned',
    answer: null,
    submitted_at: null,
    grade: null,
    feedback: null,
    checked_at: null,
    created_at: '2026-11-14 10:00:00',
    ...overrides,
  }
}
