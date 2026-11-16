import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import App from './App'
import type { Homework, HomeworkInput } from '@/lib/api'
import { API, inDays, loginResponse, makeHomework, tutor } from '@/test/fixtures'
import { server } from '@/test/server'

describe('Основной сценарий: репетитор выдаёт домашнее задание', () => {
  it('вход → пустой список → форма → задание видно в списке', async () => {
    // Маленький «сервер в памяти»: проверяем токен и сохраняем созданные задания.
    const db: Homework[] = []
    const authorized = (request: Request) =>
      request.headers.get('Authorization') === `Bearer ${loginResponse.token}`
    server.use(
      http.get(`${API}/api/homework`, ({ request }) =>
        authorized(request) ? HttpResponse.json(db) : HttpResponse.json({}, { status: 401 }),
      ),
      http.post(`${API}/api/homework`, async ({ request }) => {
        if (!authorized(request)) return HttpResponse.json({}, { status: 401 })
        const body = (await request.json()) as HomeworkInput
        const hw = makeHomework({ id: db.length + 1, ...body, student_name: 'Анна Смирнова' })
        db.push(hw)
        return HttpResponse.json(hw, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    render(<App />)

    // 1. Вход
    await user.type(screen.getByLabelText('Email'), 'tutor@example.com')
    await user.type(screen.getByLabelText('Пароль'), 'demo-password')
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    // 2. Пустой список
    expect(await screen.findByRole('heading', { name: 'Домашние задания' })).toBeVisible()
    expect(await screen.findByText('Пока нет заданий')).toBeVisible()
    expect(screen.getByText('Мария Иванова')).toBeInTheDocument()

    // 3. Форма в диалоге
    await user.click(screen.getByRole('button', { name: 'Выдать задание' }))
    const dialog = await screen.findByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText('Ученик'), 'Анна Смирнова')
    await user.type(within(dialog).getByLabelText('Название'), 'Функции и аргументы')
    await user.type(within(dialog).getByLabelText('Срок сдачи'), inDays(5))
    await user.click(within(dialog).getByRole('button', { name: 'Выдать задание' }))

    // 4. Видимый результат
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const list = screen.getByRole('list', { name: 'Домашние задания' })
    expect(within(list).getByText('Функции и аргументы')).toBeVisible()
    expect(within(list).getByText('Выдано')).toBeVisible()
    expect(screen.getByText('Задание «Функции и аргументы» выдано: Анна Смирнова')).toBeVisible()
    expect(db).toHaveLength(1)
  })

  it('после перезагрузки страницы сессия восстанавливается по сохранённому токену', async () => {
    localStorage.setItem('tutor-hub-token', 'saved-token')
    let sentToken: string | null = null
    server.use(
      http.get(`${API}/api/auth/me`, ({ request }) => {
        sentToken = request.headers.get('Authorization')
        return HttpResponse.json(tutor)
      }),
    )
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Домашние задания' })).toBeVisible()
    expect(sentToken).toBe('Bearer saved-token')
  })

  it('недействительный сохранённый токен: показываем вход и удаляем токен', async () => {
    localStorage.setItem('tutor-hub-token', 'expired')
    server.use(http.get(`${API}/api/auth/me`, () => HttpResponse.json({}, { status: 401 })))
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Вход в кабинет' })).toBeVisible()
    expect(localStorage.getItem('tutor-hub-token')).toBeNull()
  })

  it('кнопка «Выйти» возвращает на экран входа', async () => {
    localStorage.setItem('tutor-hub-token', 'saved-token')
    server.use(http.get(`${API}/api/homework`, () => HttpResponse.json([makeHomework()])))
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Выйти' }))
    expect(await screen.findByRole('heading', { name: 'Вход в кабинет' })).toBeVisible()
    expect(localStorage.getItem('tutor-hub-token')).toBeNull()
  })
})
