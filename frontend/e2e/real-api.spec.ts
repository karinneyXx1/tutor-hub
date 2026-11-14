import { expect, test } from '@playwright/test'

import { inDays } from './mock-api'

// Без подмены: браузер ходит в настоящий FastAPI (запускается в playwright.config.ts).
const API = 'http://localhost:8000'

test('настоящий API: выданное задание сохраняется и видно после перезагрузки', async ({ page, request }) => {
  const id = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  const tutor = { email: `tutor-${id}@example.com`, name: 'Репетитор E2E', password: 'e2e-password', role: 'tutor' }
  const student = { email: `student-${id}@example.com`, name: `Ученик ${id}`, password: 'e2e-password', role: 'student' }

  for (const user of [tutor, student]) {
    expect((await request.post(`${API}/api/auth/register`, { data: user })).status()).toBe(201)
  }
  const { token } = await (await request.post(`${API}/api/auth/login`, { data: tutor })).json()
  const added = await request.post(`${API}/api/students`, {
    data: { email: student.email },
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(added.status()).toBe(201)

  await page.goto('/')
  await page.getByLabel('Email').fill(tutor.email)
  await page.getByLabel('Пароль').fill(tutor.password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText('Пока нет заданий')).toBeVisible()

  await page.getByRole('button', { name: 'Выдать задание' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Ученик').selectOption({ label: student.name })
  await dialog.getByLabel('Название').fill('Задание из e2e')
  await dialog.getByLabel('Срок сдачи').fill(inDays(4))
  await dialog.getByRole('button', { name: 'Выдать задание' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('listitem').filter({ hasText: 'Задание из e2e' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Задание из e2e' })).toContainText(student.name)
})
