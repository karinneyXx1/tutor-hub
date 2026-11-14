import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { setToken } from '@/lib/api'
import { server } from './server'

// Любой запрос без подменённого ответа — ошибка теста, а не тихий проход.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  setToken(null)
  localStorage.clear()
})
afterAll(() => server.close())
