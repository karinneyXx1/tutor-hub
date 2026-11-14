import { describe, expect, it } from 'vitest'

import { todayISO, validateHomework, validateLogin } from './validation'

const valid = { studentId: '2', title: 'Циклы', description: '', dueDate: '2026-11-20' }
const TODAY = '2026-11-15'

describe('validateLogin', () => {
  it('требует email и пароль', () => {
    expect(validateLogin({ email: ' ', password: '' })).toEqual({
      email: 'Введите email',
      password: 'Введите пароль',
    })
  })

  it('отклоняет email без @ и домена', () => {
    expect(validateLogin({ email: 'tutor', password: 'x' }).email).toMatch(/формате/)
    expect(validateLogin({ email: 'tutor@mail', password: 'x' }).email).toMatch(/формате/)
  })

  it('пропускает корректные данные', () => {
    expect(validateLogin({ email: 'tutor@example.com', password: 'secret' })).toEqual({})
  })
})

describe('validateHomework', () => {
  it('корректная форма без ошибок; срок «сегодня» допустим', () => {
    expect(validateHomework(valid, TODAY)).toEqual({})
    expect(validateHomework({ ...valid, dueDate: TODAY }, TODAY)).toEqual({})
  })

  it('обязательные поля: ученик, название, срок', () => {
    expect(validateHomework({ studentId: '', title: '', description: '', dueDate: '' }, TODAY)).toEqual({
      studentId: 'Выберите ученика',
      title: 'Введите название задания',
      dueDate: 'Укажите срок сдачи',
    })
  })

  it('название из одних пробелов не подходит (как на сервере)', () => {
    expect(validateHomework({ ...valid, title: '   ' }, TODAY).title).toBe('Введите название задания')
  })

  it('слишком длинное название и описание', () => {
    expect(validateHomework({ ...valid, title: 'a'.repeat(201) }, TODAY).title).toMatch(/200/)
    expect(validateHomework({ ...valid, description: 'a'.repeat(5001) }, TODAY).description).toMatch(/5000/)
  })

  it('срок в прошлом и некорректная дата', () => {
    expect(validateHomework({ ...valid, dueDate: '2026-11-14' }, TODAY).dueDate).toBe(
      'Срок сдачи не может быть в прошлом',
    )
    expect(validateHomework({ ...valid, dueDate: '20.11.2026' }, TODAY).dueDate).toBe('Некорректная дата')
  })
})

describe('todayISO', () => {
  it('форматирует местную дату с ведущими нулями', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
