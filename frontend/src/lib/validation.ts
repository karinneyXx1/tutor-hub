// Правила проверки форм — те же, что на сервере (backend/app/schemas.py).

export type Errors<K extends string> = Partial<Record<K, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Сегодняшняя дата в формате YYYY-MM-DD по местному времени. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export interface LoginValues {
  email: string
  password: string
}

export function validateLogin(values: LoginValues): Errors<keyof LoginValues> {
  const errors: Errors<keyof LoginValues> = {}
  const email = values.email.trim()
  if (!email) errors.email = 'Введите email'
  else if (!EMAIL_RE.test(email)) errors.email = 'Email должен быть в формате name@example.com'
  if (!values.password) errors.password = 'Введите пароль'
  return errors
}

export interface HomeworkValues {
  studentId: string
  title: string
  description: string
  dueDate: string
}

export const TITLE_MAX = 200
export const DESCRIPTION_MAX = 5000

export function validateHomework(
  values: HomeworkValues,
  today: string = todayISO(),
): Errors<keyof HomeworkValues> {
  const errors: Errors<keyof HomeworkValues> = {}
  if (!values.studentId) errors.studentId = 'Выберите ученика'

  const title = values.title.trim()
  if (!title) errors.title = 'Введите название задания'
  else if (title.length > TITLE_MAX) errors.title = `Название — не длиннее ${TITLE_MAX} символов`

  if (values.description.length > DESCRIPTION_MAX) {
    errors.description = `Описание — не длиннее ${DESCRIPTION_MAX} символов`
  }

  if (!values.dueDate) errors.dueDate = 'Укажите срок сдачи'
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.dueDate)) errors.dueDate = 'Некорректная дата'
  else if (values.dueDate < today) errors.dueDate = 'Срок сдачи не может быть в прошлом'

  return errors
}

export const hasErrors = (errors: object) => Object.keys(errors).length > 0

/** Переводит фокус на первое поле с ошибкой — удобно при работе с клавиатуры. */
export function focusFirstError<K extends string>(errors: Errors<K>, ids: Record<K, string>) {
  const first = (Object.keys(ids) as K[]).find((key) => errors[key])
  if (first) document.getElementById(ids[first])?.focus()
}
