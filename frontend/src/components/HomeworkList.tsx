import { CalendarDays } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Homework } from '@/lib/api'
import { avatarColor, formatDate, initials, isOverdue, STATUS_LABEL, STATUS_STYLE } from '@/lib/format'
import { cn } from '@/lib/utils'

export function HomeworkList({ items }: { items: Homework[] }) {
  return (
    <ul className="grid gap-3" aria-label="Домашние задания">
      {items.map((hw) => {
        const overdue = isOverdue(hw)
        const style = STATUS_STYLE[hw.status]
        return (
          <li key={hw.id}>
            <Card className="relative transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 hover:ring-foreground/20">
              <span className={cn('absolute inset-y-0 left-0 w-1', style.stripe)} aria-hidden="true" />
              <CardHeader className="gap-2 pl-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base break-words">{hw.title}</CardTitle>
                  <Badge className={cn('h-6 px-2.5', style.badge)}>{STATUS_LABEL[hw.status]}</Badge>
                </div>
                {hw.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground whitespace-pre-line">
                    {hw.description}
                  </p>
                )}
                <CardDescription className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="inline-flex items-center gap-2">
                    <Avatar size="sm" aria-hidden="true">
                      <AvatarFallback className={cn('text-[0.65rem] font-medium', avatarColor(hw.student_id))}>
                        {initials(hw.student_name)}
                      </AvatarFallback>
                    </Avatar>
                    Ученик: {hw.student_name}
                  </span>
                  <span className={cn('inline-flex items-center gap-1.5', overdue && 'text-destructive')}>
                    <CalendarDays className="size-4" aria-hidden="true" />
                    до {formatDate(hw.due_date)}
                    {overdue && <span> · просрочено</span>}
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
