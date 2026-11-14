import { CalendarDays } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Homework } from '@/lib/api'
import { formatDate, STATUS_LABEL } from '@/lib/format'

const STATUS_VARIANT = {
  assigned: 'secondary',
  submitted: 'default',
  returned: 'destructive',
  checked: 'outline',
} as const

export function HomeworkList({ items }: { items: Homework[] }) {
  return (
    <ul className="grid gap-3" aria-label="Домашние задания">
      {items.map((hw) => (
        <li key={hw.id}>
          <Card size="sm">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base break-words">{hw.title}</CardTitle>
                <Badge variant={STATUS_VARIANT[hw.status]}>{STATUS_LABEL[hw.status]}</Badge>
              </div>
              <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Ученик: {hw.student_name}</span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  до {formatDate(hw.due_date)}
                </span>
              </CardDescription>
              {hw.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{hw.description}</p>
              )}
            </CardHeader>
          </Card>
        </li>
      ))}
    </ul>
  )
}
