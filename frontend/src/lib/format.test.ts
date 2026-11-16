import { describe, expect, it } from 'vitest'

import { countByStatus, initials, isOverdue } from './format'

describe('format', () => {
  it('инициалы из имени и фамилии', () => {
    expect(initials('Анна Смирнова')).toBe('АС')
    expect(initials('  иван  ')).toBe('И')
  })

  it('просрочено: срок прошёл и задание не проверено', () => {
    const today = '2026-11-15'
    expect(isOverdue({ due_date: '2026-11-14', status: 'assigned' }, today)).toBe(true)
    expect(isOverdue({ due_date: '2026-11-14', status: 'returned' }, today)).toBe(true)
    expect(isOverdue({ due_date: '2026-11-14', status: 'checked' }, today)).toBe(false)
    expect(isOverdue({ due_date: '2026-11-15', status: 'assigned' }, today)).toBe(false)
  })

  it('подсчёт по статусам', () => {
    expect(countByStatus([{ status: 'assigned' }, { status: 'assigned' }, { status: 'checked' }])).toEqual({
      assigned: 2,
      submitted: 0,
      returned: 0,
      checked: 1,
    })
  })
})
