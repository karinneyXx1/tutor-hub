import { expect, test, type Page } from '@playwright/test'

import { inDays, mockApi } from './mock-api'

async function login(page: Page) {
  await page.goto('/')
  await page.getByLabel('Email').fill('tutor@example.com')
  await page.getByLabel('Пароль').fill('demo-password')
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText('Пока нет заданий')).toBeVisible()
}

test('основной сценарий: вход → выдать задание → задание в списке', async ({ page }) => {
  const calls = await mockApi(page)
  await login(page)

  await page.getByRole('button', { name: 'Выдать задание' }).click()
  const dialog = page.getByRole('dialog', { name: 'Новое домашнее задание' })
  await expect(dialog).toBeVisible()

  // Сначала пустая отправка — видим сообщения об ошибках.
  await dialog.getByRole('button', { name: 'Выдать задание' }).click()
  await expect(dialog.getByText('Введите название задания')).toBeVisible()

  await dialog.getByLabel('Ученик').selectOption({ label: 'Анна Смирнова' })
  await dialog.getByLabel('Название').fill('Циклы for и while')
  await dialog.getByLabel('Описание').fill('Задачи 1–5 из сборника')
  await dialog.getByLabel('Срок сдачи').fill(inDays(7))
  await dialog.getByRole('button', { name: 'Выдать задание' }).click()

  await expect(dialog).toBeHidden()
  const card = page.getByRole('list', { name: 'Домашние задания' }).getByRole('listitem')
  await expect(card).toHaveCount(1)
  await expect(card).toContainText('Циклы for и while')
  await expect(card).toContainText('Ученик: Анна Смирнова')
  await expect(card).toContainText('Выдано')
  await expect(page.getByText('Задание «Циклы for и while» выдано: Анна Смирнова')).toBeVisible()
  expect(calls.createHomework).toBe(1)
})

test('весь сценарий выполняется с клавиатуры, фокус виден', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')

  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Email')).toBeFocused()
  await page.keyboard.type('tutor@example.com')
  await page.keyboard.press('Tab')
  await page.keyboard.type('demo-password')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Пока нет заданий')).toBeVisible()

  // Tab до кнопки «Выдать задание» и Enter.
  const create = page.getByRole('button', { name: 'Выдать задание' })
  for (let i = 0; i < 5 && !(await create.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab')
  }
  await expect(create).toBeFocused()
  // Видимый индикатор фокуса: кольцо 3px цвета --ring (box-shadow «0 0 0 3px»).
  await expect(create).toHaveCSS('box-shadow', /0px 0px 0px 3px/)
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Ученик')).toBeFocused() // фокус переходит в диалог
  // Нативный <select>: с клавиатуры его открывает и переключает сам браузер (Alt+↓, буквы).
  // Headless-Chromium не рисует системный список, поэтому выбираем значение у элемента в фокусе.
  await page.locator(':focus').selectOption({ label: 'Анна Смирнова' })
  await expect(dialog.getByLabel('Ученик')).toHaveValue('2')
  await page.keyboard.press('Tab')
  await expect(dialog.getByLabel('Название')).toBeFocused()
  await expect(dialog.getByLabel('Название')).toHaveCSS('box-shadow', /0px 0px 0px 3px/)
  await page.keyboard.type('Задание с клавиатуры')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(dialog.getByLabel('Срок сдачи')).toBeFocused()
  await dialog.getByLabel('Срок сдачи').fill(inDays(3))
  await page.keyboard.press('Enter')

  await expect(dialog).toBeHidden()
  await expect(page.getByRole('listitem').filter({ hasText: 'Задание с клавиатуры' })).toBeVisible()
})

test('двойной клик и Enter во время сохранения — только один запрос', async ({ page }) => {
  const calls = await mockApi(page, { createDelay: 800 })
  await login(page)
  await page.getByRole('button', { name: 'Выдать задание' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Ученик').selectOption({ label: 'Иван Петров' })
  await dialog.getByLabel('Название').fill('Рекурсия')
  await dialog.getByLabel('Срок сдачи').fill(inDays(2))

  await dialog.getByRole('button', { name: 'Выдать задание' }).dblclick()
  await dialog.getByLabel('Название').press('Enter')
  await expect(dialog.getByRole('button', { name: 'Сохраняем…' })).toBeDisabled()

  await expect(dialog).toBeHidden()
  await expect(page.getByRole('list', { name: 'Домашние задания' }).getByRole('listitem')).toHaveCount(1)
  expect(calls.createHomework).toBe(1)
})

test('узкий экран (375px): нет горизонтальной прокрутки, форма доступна', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 })
  await mockApi(page)
  await login(page)
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(scroll).toBeLessThanOrEqual(375)

  await page.getByRole('button', { name: 'Выдать задание' }).click()
  const dialog = page.getByRole('dialog')
  for (const label of ['Ученик', 'Название', 'Описание', 'Срок сдачи']) {
    await expect(dialog.getByLabel(label)).toBeInViewport()
  }
  await expect(dialog.getByRole('button', { name: 'Выдать задание' })).toBeInViewport()
})
