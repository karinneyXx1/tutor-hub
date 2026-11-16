import type { Homework, HomeworkStatus } from './api'
import { todayISO } from './validation'

export const STATUS_LABEL: Record<HomeworkStatus, string> = {
  assigned: 'Выдано',
  submitted: 'Сдано',
  returned: 'На доработке',
  checked: 'Проверено',
}

export const STATUSES: HomeworkStatus[] = ['assigned', 'submitted', 'returned', 'checked']

/** Классы цвета статуса — значения из токенов темы --status-* (src/index.css). */
export const STATUS_STYLE: Record<HomeworkStatus, { badge: string; stripe: string; icon: string }> = {
  assigned: {
    badge: 'bg-status-assigned/15 text-status-assigned',
    stripe: 'bg-status-assigned',
    icon: 'bg-status-assigned/15 text-status-assigned',
  },
  submitted: {
    badge: 'bg-status-submitted/15 text-status-submitted',
    stripe: 'bg-status-submitted',
    icon: 'bg-status-submitted/15 text-status-submitted',
  },
  returned: {
    badge: 'bg-status-returned/15 text-status-returned',
    stripe: 'bg-status-returned',
    icon: 'bg-status-returned/15 text-status-returned',
  },
  checked: {
    badge: 'bg-status-checked/15 text-status-checked',
    stripe: 'bg-status-checked',
    icon: 'bg-status-checked/15 text-status-checked',
  },
}

/** 2026-11-20 → «20 ноября 2026 г.» */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** «Анна Смирнова» → «АС». */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

/** Срок прошёл, а задание ещё не проверено. */
export function isOverdue(hw: Pick<Homework, 'due_date' | 'status'>, today: string = todayISO()): boolean {
  return hw.status !== 'checked' && hw.due_date < today
}

export function countByStatus(items: Pick<Homework, 'status'>[]): Record<HomeworkStatus, number> {
  const counts: Record<HomeworkStatus, number> = { assigned: 0, submitted: 0, returned: 0, checked: 0 }
  for (const hw of items) counts[hw.status] += 1
  return counts
}

const AVATAR_COLORS = [
  'bg-status-checked/20 text-status-checked',
  'bg-status-assigned/20 text-status-assigned',
  'bg-status-submitted/20 text-status-submitted',
  'bg-destructive/20 text-destructive',
  'bg-status-returned/20 text-status-returned',
]

/** Постоянный цвет аватара для ученика. */
export const avatarColor = (studentId: number) => AVATAR_COLORS[studentId % AVATAR_COLORS.length]
