import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import type { HomeworkInput } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { API, inDays, makeHomework, studentUser, tutor } from '@/test/fixtures'
import { server } from '@/test/server'
import { HomeworkPage } from './HomeworkPage'

function setup(user = tutor) {
  const ue = userEvent.setup()
  render(<HomeworkPage user={user} />)
  return ue
}

/** Ответ на POST /api/homework, собранный из тела запроса, как это делает сервер. */
const created = (body: HomeworkInput, id = 42) =>
  makeHomework({
    id,
    student_id: body.student_id,
    student_name: body.student_id === 3 ? 'Иван Петров' : 'Анна Смирнова',
    title: body.title,
    description: body.description,
    due_date: body.due_date,
  })

async function openDialog(ue: ReturnType<typeof userEvent.setup>) {
  await ue.click(await screen.findByRole('button', { name: 'Выдать задание' }))
  return screen.findByRole('dialog', { name: 'Новое домашнее задание' })
}

async function fillForm(ue: ReturnType<typeof userEvent.setup>, title = 'Циклы for и while') {
  await ue.selectOptions(screen.getByLabelText('Ученик'), 'Иван Петров')
  await ue.type(screen.getByLabelText('Название'), title)
  await ue.type(screen.getByLabelText(/^Описание/), 'Задачи 1–5')
  await ue.type(screen.getByLabelText('Срок сдачи'), inDays(7))
}

describe('Список заданий: состояния', () => {
  it('загрузка: пока сервер отвечает, видны скелетоны и текст для экранного диктора', async () => {
    server.use(
      http.get(`${API}/api/homework`, async () => {
        await delay(100)
        return HttpResponse.json([makeHomework()])
      }),
    )
    setup()
    expect(screen.getByText('Загружаем задания…')).toBeInTheDocument()
    expect(screen.getAllByTestId('homework-skeleton')).toHaveLength(3)

    expect(await screen.findByText('Списки и словари')).toBeVisible()
    expect(screen.queryByText('Загружаем задания…')).not.toBeInTheDocument()
  })

  it('пустой ответ: сообщение «Пока нет заданий» и кнопка выдать первое', async () => {
    setup()
    expect(await screen.findByText('Пока нет заданий')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Выдать первое задание' })).toBeEnabled()
    expect(screen.queryByRole('list', { name: 'Домашние задания' })).not.toBeInTheDocument()
  })

  it('успешный ответ: карточки с названием, учеником, сроком и статусом', async () => {
    server.use(
      http.get(`${API}/api/homework`, () =>
        HttpResponse.json([
          makeHomework({ id: 1, title: 'Списки', due_date: '2026-11-20', status: 'assigned' }),
          makeHomework({ id: 2, title: 'Рекурсия', student_name: 'Иван Петров', status: 'checked' }),
        ]),
      ),
    )
    setup()
    const list = await screen.findByRole('list', { name: 'Домашние задания' })
    const cards = within(list).getAllByRole('listitem')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('Списки')
    expect(cards[0]).toHaveTextContent('Ученик: Анна Смирнова')
    expect(cards[0]).toHaveTextContent(`до ${formatDate('2026-11-20')}`)
    expect(cards[0]).toHaveTextContent('Выдано')
    expect(cards[1]).toHaveTextContent('Иван Петров')
    expect(cards[1]).toHaveTextContent('Проверено')
  })

  it('сводка считает задания по статусам; просроченное помечено, у ученика инициалы', async () => {
    server.use(
      http.get(`${API}/api/homework`, () =>
        HttpResponse.json([
          makeHomework({ id: 1, title: 'Старое', due_date: inDays(-2), status: 'assigned' }),
          makeHomework({ id: 2, title: 'Сданное', status: 'submitted' }),
          makeHomework({ id: 3, title: 'Проверенное', due_date: inDays(-5), status: 'checked' }),
          makeHomework({ id: 4, title: 'Новое', status: 'assigned' }),
        ]),
      ),
    )
    setup()
    const stats = await screen.findByRole('list', { name: 'Сводка по статусам' })
    const tiles = within(stats).getAllByRole('listitem')
    expect(tiles.map((t) => t.textContent)).toEqual(['2Выдано', '1Сдано', '0На доработке', '1Проверено'])

    const cards = within(screen.getByRole('list', { name: 'Домашние задания' })).getAllByRole('listitem')
    expect(cards[0]).toHaveTextContent('просрочено')
    expect(cards[2]).not.toHaveTextContent('просрочено') // проверенное не считается просроченным
    expect(cards[3]).not.toHaveTextContent('просрочено')
    expect(cards[0]).toHaveTextContent('АС')
  })

  it('ошибка сервера: понятное сообщение и «Повторить» загружает заново', async () => {
    let attempt = 0
    server.use(
      http.get(`${API}/api/homework`, () => {
        attempt += 1
        return attempt === 1
          ? HttpResponse.json({ detail: 'Internal Server Error' }, { status: 500 })
          : HttpResponse.json([makeHomework()])
      }),
    )
    const ue = setup()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Не удалось загрузить задания')
    expect(alert).toHaveTextContent('Сервер временно недоступен')

    await ue.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByText('Списки и словари')).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('нет связи с сервером: отдельное сообщение', async () => {
    server.use(http.get(`${API}/api/homework`, () => HttpResponse.error()))
    setup()
    expect(await screen.findByRole('alert')).toHaveTextContent('Нет связи с сервером')
  })

  it('у репетитора нет учеников: подсказка, выдать задание нельзя', async () => {
    server.use(http.get(`${API}/api/students`, () => HttpResponse.json([])))
    setup()
    expect(await screen.findByText(/пока нет учеников/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Выдать задание' })).toBeDisabled()
  })

  it('ученик видит свои задания без кнопки «Выдать задание»', async () => {
    server.use(http.get(`${API}/api/homework`, () => HttpResponse.json([makeHomework()])))
    setup(studentUser)
    expect(await screen.findByText('Списки и словари')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Выдать задание' })).not.toBeInTheDocument()
  })
})

describe('Диалог «Новое домашнее задание»', () => {
  it('открывается кнопкой, показывает поля с подписями и закрывается «Отмена»', async () => {
    const ue = setup()
    const dialog = await openDialog(ue)
    for (const label of ['Ученик', 'Название', /^Описание \(необязательно\)/, 'Срок сдачи']) {
      expect(within(dialog).getByLabelText(label)).toBeVisible()
    }
    await ue.click(within(dialog).getByRole('button', { name: 'Отмена' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('закрывается клавишей Escape и крестиком; при повторном открытии форма пустая', async () => {
    const ue = setup()
    await openDialog(ue)
    await ue.type(screen.getByLabelText('Название'), 'Черновик')
    await ue.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const dialog = await openDialog(ue)
    expect(within(dialog).getByLabelText('Название')).toHaveValue('')
    await ue.click(within(dialog).getByRole('button', { name: 'Закрыть' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('кнопка в пустом состоянии тоже открывает диалог', async () => {
    const ue = setup()
    await ue.click(await screen.findByRole('button', { name: 'Выдать первое задание' }))
    expect(await screen.findByRole('dialog')).toBeVisible()
  })
})

describe('Валидация формы задания', () => {
  it('пустая форма: сообщения у обязательных полей, фокус на первом, запрос не уходит', async () => {
    const posts = vi.fn()
    server.use(http.post(`${API}/api/homework`, () => (posts(), HttpResponse.json({}))))
    const ue = setup()
    const dialog = await openDialog(ue)

    await ue.click(within(dialog).getByRole('button', { name: 'Выдать задание' }))

    expect(within(dialog).getByText('Выберите ученика')).toBeVisible()
    expect(within(dialog).getByText('Введите название задания')).toBeVisible()
    expect(within(dialog).getByText('Укажите срок сдачи')).toBeVisible()
    expect(screen.getByLabelText('Название')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Ученик')).toHaveFocus()
    expect(posts).not.toHaveBeenCalled()
    expect(dialog).toBeVisible()
  })

  it('название из пробелов и срок в прошлом отклоняются', async () => {
    const ue = setup()
    await openDialog(ue)
    await ue.selectOptions(screen.getByLabelText('Ученик'), 'Анна Смирнова')
    await ue.type(screen.getByLabelText('Название'), '   ')
    await ue.type(screen.getByLabelText('Срок сдачи'), inDays(-1))
    await ue.click(screen.getByRole('button', { name: 'Выдать задание' }))

    expect(screen.getByText('Введите название задания')).toBeVisible()
    expect(screen.getByText('Срок сдачи не может быть в прошлом')).toBeVisible()
    expect(screen.queryByText('Выберите ученика')).not.toBeInTheDocument()
  })

  it('сообщение об ошибке исчезает, когда поле исправляют', async () => {
    const ue = setup()
    await openDialog(ue)
    await ue.click(screen.getByRole('button', { name: 'Выдать задание' }))
    expect(screen.getByText('Введите название задания')).toBeVisible()

    await ue.type(screen.getByLabelText('Название'), 'Строки')
    expect(screen.queryByText('Введите название задания')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Название')).toHaveAttribute('aria-invalid', 'false')
  })
})

describe('Отправка формы', () => {
  it('успех: отправляет данные в формате API, закрывает диалог, задание появляется в списке', async () => {
    let body: HomeworkInput | undefined
    server.use(
      http.post(`${API}/api/homework`, async ({ request }) => {
        body = (await request.json()) as HomeworkInput
        return HttpResponse.json(created(body), { status: 201 })
      }),
    )
    const ue = setup()
    await openDialog(ue)
    await fillForm(ue, '  Циклы for и while  ')
    await ue.click(screen.getByRole('button', { name: 'Выдать задание' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(body).toEqual({
      student_id: 3,
      title: 'Циклы for и while',
      description: 'Задачи 1–5',
      due_date: inDays(7),
    })
    const card = within(screen.getByRole('list', { name: 'Домашние задания' })).getByRole('listitem')
    expect(card).toHaveTextContent('Циклы for и while')
    expect(card).toHaveTextContent('Ученик: Иван Петров')
    expect(screen.getByText('Задание «Циклы for и while» выдано: Иван Петров')).toBeVisible()
    expect(screen.queryByText('Пока нет заданий')).not.toBeInTheDocument()
  })

  it('сервер отклонил срок (422): ошибка у поля даты, введённые данные сохранены', async () => {
    server.use(
      http.post(`${API}/api/homework`, () =>
        HttpResponse.json({ detail: 'Due date is in the past' }, { status: 422 }),
      ),
    )
    const ue = setup()
    const dialog = await openDialog(ue)
    await fillForm(ue)
    await ue.click(screen.getByRole('button', { name: 'Выдать задание' }))

    expect(await within(dialog).findByText('Срок сдачи не может быть в прошлом')).toBeVisible()
    expect(screen.getByLabelText('Срок сдачи')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Название')).toHaveValue('Циклы for и while')
    expect(screen.getByLabelText('Ученик')).toHaveValue('3')
  })

  it('ошибка сервера (500): сообщение в форме, данные на месте, повторная отправка успешна', async () => {
    let attempt = 0
    server.use(
      http.post(`${API}/api/homework`, async ({ request }) => {
        attempt += 1
        if (attempt === 1) return HttpResponse.json({ detail: 'boom' }, { status: 500 })
        return HttpResponse.json(created((await request.json()) as HomeworkInput), { status: 201 })
      }),
    )
    const ue = setup()
    const dialog = await openDialog(ue)
    await fillForm(ue)
    await ue.click(screen.getByRole('button', { name: 'Выдать задание' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Сервер временно недоступен')
    expect(screen.getByLabelText('Название')).toHaveValue('Циклы for и while')
    expect(screen.getByRole('button', { name: 'Выдать задание' })).toBeEnabled()

    await ue.click(screen.getByRole('button', { name: 'Выдать задание' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Циклы for и while')).toBeVisible()
    expect(attempt).toBe(2)
  })

  it('во время ожидания двойной клик и Enter не создают второй запрос', async () => {
    let posts = 0
    server.use(
      http.post(`${API}/api/homework`, async ({ request }) => {
        posts += 1
        const body = (await request.json()) as HomeworkInput
        await delay(300)
        return HttpResponse.json(created(body, 100 + posts), { status: 201 })
      }),
    )
    const ue = setup()
    await openDialog(ue)
    await fillForm(ue)

    await ue.dblClick(screen.getByRole('button', { name: 'Выдать задание' }))
    await ue.type(screen.getByLabelText('Название'), '{Enter}')

    // Пока идёт запрос: кнопка заблокирована и показывает «Сохраняем…», Escape диалог не закрывает.
    expect(screen.getByRole('button', { name: 'Сохраняем…' })).toBeDisabled()
    await ue.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(posts).toBe(1)
    expect(screen.getAllByText('Циклы for и while')).toHaveLength(1)
  })

  it('две отправки быстрее перерисовки (кнопка ещё не заблокирована) — всё равно один запрос', async () => {
    let posts = 0
    server.use(
      http.post(`${API}/api/homework`, async ({ request }) => {
        posts += 1
        const body = (await request.json()) as HomeworkInput
        await delay(100)
        return HttpResponse.json(created(body), { status: 201 })
      }),
    )
    const ue = setup()
    const dialog = await openDialog(ue)
    await fillForm(ue)
    const form = within(dialog).getByRole('form', { name: 'Новое домашнее задание' }) as HTMLFormElement

    // Оба submit внутри одного act: React не успевает перерисовать и заблокировать кнопку.
    act(() => {
      form.requestSubmit()
      form.requestSubmit()
    })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(posts).toBe(1)
  })
})
