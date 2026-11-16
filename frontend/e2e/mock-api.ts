import type { Page, Route } from '@playwright/test'

// Подменённый API для браузерных тестов: те же форматы, что у backend/app/schemas.py.
export const tutor = { id: 1, email: 'tutor@example.com', name: 'Мария Иванова', role: 'tutor' }
export const students = [
  { id: 2, email: 'anna@example.com', name: 'Анна Смирнова', role: 'student' },
  { id: 3, email: 'ivan@example.com', name: 'Иван Петров', role: 'student' },
]

export const inDays = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Options {
  /** Задержка ответа на создание задания, мс. */
  createDelay?: number
}

export async function mockApi(page: Page, options: Options = {}) {
  const homework: Record<string, unknown>[] = []
  const calls = { createHomework: 0 }
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

  await page.route('http://localhost:8000/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()

    if (method === 'POST' && path === '/api/auth/login') return json(route, { token: 't', user: tutor })
    if (method === 'GET' && path === '/api/auth/me') return json(route, tutor)
    if (method === 'GET' && path === '/api/students') return json(route, students)
    if (method === 'GET' && path === '/api/homework') return json(route, homework)
    if (method === 'POST' && path === '/api/homework') {
      calls.createHomework += 1
      const body = request.postDataJSON()
      if (options.createDelay) await new Promise((r) => setTimeout(r, options.createDelay))
      const student = students.find((s) => s.id === body.student_id)!
      const created = {
        id: homework.length + 1,
        tutor_id: 1,
        student_id: body.student_id,
        student_name: student.name,
        title: body.title,
        description: body.description,
        due_date: body.due_date,
        status: 'assigned',
        answer: null,
        submitted_at: null,
        grade: null,
        feedback: null,
        checked_at: null,
        created_at: '2026-11-15 10:00:00',
      }
      homework.push(created)
      return json(route, created, 201)
    }
    return json(route, { detail: 'Not Found' }, 404)
  })
  return calls
}
