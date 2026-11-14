import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { API, loginResponse } from '@/test/fixtures'
import { server } from '@/test/server'
import { LoginForm } from './LoginForm'

function setup() {
  const onLogin = vi.fn()
  const user = userEvent.setup()
  render(<LoginForm onLogin={onLogin} />)
  return { user, onLogin }
}

describe('LoginForm', () => {
  it('показывает поля с подписями и кнопку входа', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Войти' })).toBeEnabled()
  })

  it('пустая форма: сообщения у обоих полей, фокус на первом, запрос не отправляется', async () => {
    const { user, onLogin } = setup()
    const requests = vi.fn()
    server.events.on('request:start', requests)

    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(screen.getByText('Введите email')).toBeVisible()
    expect(screen.getByText('Введите пароль')).toBeVisible()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Email')).toHaveFocus()
    expect(requests).not.toHaveBeenCalled()
    expect(onLogin).not.toHaveBeenCalled()
    server.events.removeAllListeners()
  })

  it('некорректный email: понятное сообщение; ошибка исчезает при исправлении', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText('Email'), 'tutor')
    await user.type(screen.getByLabelText('Пароль'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(screen.getByText('Email должен быть в формате name@example.com')).toBeVisible()

    await user.type(screen.getByLabelText('Email'), '@example.com')
    expect(screen.queryByText(/в формате/)).not.toBeInTheDocument()
  })

  it('успешный вход: отправляет email и пароль и передаёт ответ сервера', async () => {
    let body: unknown
    server.use(
      http.post(`${API}/api/auth/login`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(loginResponse)
      }),
    )
    const { user, onLogin } = setup()
    await user.type(screen.getByLabelText('Email'), '  tutor@example.com ')
    await user.type(screen.getByLabelText('Пароль'), 'demo-password{Enter}')

    await vi.waitFor(() => expect(onLogin).toHaveBeenCalledWith(loginResponse))
    expect(body).toEqual({ email: 'tutor@example.com', password: 'demo-password' })
  })

  it('неверный пароль (401): сообщение на русском, введённые данные остаются', async () => {
    server.use(
      http.post(`${API}/api/auth/login`, () =>
        HttpResponse.json({ detail: 'Wrong email or password' }, { status: 401 }),
      ),
    )
    const { user, onLogin } = setup()
    await user.type(screen.getByLabelText('Email'), 'tutor@example.com')
    await user.type(screen.getByLabelText('Пароль'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный email или пароль')
    expect(screen.getByLabelText('Email')).toHaveValue('tutor@example.com')
    expect(screen.getByRole('button', { name: 'Войти' })).toBeEnabled()
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('во время входа двойной клик и Enter не создают второй запрос', async () => {
    let calls = 0
    server.use(
      http.post(`${API}/api/auth/login`, async () => {
        calls += 1
        await delay(200)
        return HttpResponse.json(loginResponse)
      }),
    )
    const { user, onLogin } = setup()
    await user.type(screen.getByLabelText('Email'), 'tutor@example.com')
    await user.type(screen.getByLabelText('Пароль'), 'demo-password')

    await user.dblClick(screen.getByRole('button', { name: 'Войти' }))
    await user.type(screen.getByLabelText('Пароль'), '{Enter}')

    expect(screen.getByRole('button', { name: 'Входим…' })).toBeDisabled()
    await vi.waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1))
    expect(calls).toBe(1)
  })
})
