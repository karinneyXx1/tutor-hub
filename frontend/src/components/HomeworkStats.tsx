import { CircleCheck, Inbox, PencilLine, Send, type LucideIcon } from 'lucide-react'

import { Card } from '@/components/ui/card'
import type { Homework, HomeworkStatus } from '@/lib/api'
import { countByStatus, STATUS_LABEL, STATUS_STYLE, STATUSES } from '@/lib/format'
import { cn } from '@/lib/utils'

const ICON: Record<HomeworkStatus, LucideIcon> = {
  assigned: Send,
  submitted: Inbox,
  returned: PencilLine,
  checked: CircleCheck,
}

/** Сводка над списком: сколько заданий в каждом статусе. */
export function HomeworkStats({ items }: { items: Homework[] }) {
  const counts = countByStatus(items)
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Сводка по статусам">
      {STATUSES.map((status) => {
        const Icon = ICON[status]
        return (
          <li key={status}>
            <Card size="sm" className="flex-row items-start justify-between px-4">
              <div>
                <p className="text-3xl leading-none font-semibold tabular-nums">{counts[status]}</p>
                <p className="mt-2 text-sm text-muted-foreground">{STATUS_LABEL[status]}</p>
              </div>
              <span
                className={cn('grid size-9 place-items-center rounded-lg', STATUS_STYLE[status].icon)}
                aria-hidden="true"
              >
                <Icon className="size-4.5" />
              </span>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
