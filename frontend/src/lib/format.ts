import type { HomeworkStatus } from './api'

export const STATUS_LABEL: Record<HomeworkStatus, string> = {
  assigned: 'Выдано',
  submitted: 'Сдано',
  returned: 'На доработке',
  checked: 'Проверено',
}

/** 2026-11-20 → «20 ноября 2026». */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
