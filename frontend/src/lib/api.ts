// Клиент API tutor-hub. Форматы совпадают с backend/app/schemas.py.

export type Role = 'tutor' | 'student'
export type HomeworkStatus = 'assigned' | 'submitted' | 'returned' | 'checked'

export interface User {
  id: number
  email: string
  name: string
  role: Role
}

export interface LoginResponse {
  token: string
  user: User
}

export interface Homework {
  id: number
  tutor_id: number
  student_id: number
  student_name: string
  title: string
  description: string
  due_date: string
  status: HomeworkStatus
  answer: string | null
  submitted_at: string | null
  grade: number | null
  feedback: string | null
  checked_at: string | null
  created_at: string
}

export interface HomeworkInput {
  student_id: number
  title: string
  description: string
  due_date: string
}

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

/** Ошибка API: HTTP-статус и понятный пользователю текст. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// FastAPI отвечает {"detail": "текст"} или {"detail": [{"loc": [...], "msg": "..."}]} при 422.
const KNOWN_DETAILS: Record<string, string> = {
  'Wrong email or password': 'Неверный email или пароль',
  'Due date is in the past': 'Срок сдачи не может быть в прошлом',
  'Student not found': 'Ученик не найден среди ваших учеников',
}

function messageFor(status: number, detail: unknown): string {
  if (typeof detail === 'string' && KNOWN_DETAILS[detail]) return KNOWN_DETAILS[detail]
  if (status === 401) return 'Сессия истекла, войдите снова'
  if (status === 403) return 'Это действие доступно только репетитору'
  if (status === 404) return 'Не найдено'
  if (status === 422) return 'Проверьте заполнение полей'
  if (status >= 500) return 'Сервер временно недоступен. Попробуйте ещё раз'
  return 'Что-то пошло не так. Попробуйте ещё раз'
}

let token: string | null = null

export function setToken(value: string | null) {
  token = value
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Нет связи с сервером. Проверьте подключение и попробуйте ещё раз')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(response.status, messageFor(response.status, body?.detail))
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  me: () => request<User>('/api/auth/me'),
  students: () => request<User[]>('/api/students'),
  homework: () => request<Homework[]>('/api/homework'),
  createHomework: (data: HomeworkInput) =>
    request<Homework>('/api/homework', { method: 'POST', body: JSON.stringify(data) }),
}
