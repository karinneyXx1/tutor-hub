import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

import { API, loginResponse, students, tutor } from './fixtures'

// Ответы «по умолчанию»: вход успешен, у репетитора два ученика и пока нет заданий.
// В тестах отдельные ответы подменяются через server.use(...).
export const handlers = [
  http.post(`${API}/api/auth/login`, () => HttpResponse.json(loginResponse)),
  http.post(`${API}/api/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${API}/api/auth/me`, () => HttpResponse.json(tutor)),
  http.get(`${API}/api/students`, () => HttpResponse.json(students)),
  http.get(`${API}/api/homework`, () => HttpResponse.json([])),
]

export const server = setupServer(...handlers)
