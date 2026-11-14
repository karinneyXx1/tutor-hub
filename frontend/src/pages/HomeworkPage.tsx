import { useCallback, useEffect, useState } from 'react'
import { CircleCheck, ClipboardList, Plus, RotateCw } from 'lucide-react'

import { HomeworkDialog } from '@/components/HomeworkDialog'
import { HomeworkList } from '@/components/HomeworkList'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError, type Homework, type User } from '@/lib/api'

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; homework: Homework[]; students: User[] }

export function HomeworkPage({ user }: { user: User }) {
  const isTutor = user.role === 'tutor'
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogKey, setDialogKey] = useState(0)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [homework, students] = await Promise.all([
        api.homework(),
        isTutor ? api.students() : Promise.resolve([]),
      ])
      setState({ kind: 'ready', homework, students })
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof ApiError ? error.message : 'Неизвестная ошибка',
      })
    }
  }, [isTutor])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const retry = () => {
    setState({ kind: 'loading' })
    void fetchData()
  }

  const handleCreated = (created: Homework) => {
    setState((s) =>
      s.kind === 'ready'
        ? {
            ...s,
            homework: [...s.homework, created].sort(
              (a, b) => a.due_date.localeCompare(b.due_date) || a.id - b.id,
            ),
          }
        : s,
    )
    setSuccess(`Задание «${created.title}» выдано: ${created.student_name}`)
  }

  const openDialog = () => {
    setSuccess(null)
    setDialogKey((k) => k + 1)
    setDialogOpen(true)
  }

  const students = state.kind === 'ready' ? state.students : []
  const canCreate = isTutor && state.kind === 'ready' && students.length > 0

  return (
    <section aria-labelledby="homework-heading" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 id="homework-heading" className="text-2xl font-semibold tracking-tight">
            Домашние задания
          </h1>
          <p className="text-sm text-muted-foreground">
            {isTutor ? 'Задания, которые вы выдали ученикам' : 'Задания от вашего репетитора'}
          </p>
        </div>
        {isTutor && (
          <Button size="lg" onClick={openDialog} disabled={!canCreate}>
            <Plus aria-hidden="true" />
            Выдать задание
          </Button>
        )}
      </div>

      <div role="status" aria-live="polite">
        {success && (
          <Alert className="border-success/40 text-success">
            <CircleCheck aria-hidden="true" />
            <AlertDescription className="text-success">{success}</AlertDescription>
          </Alert>
        )}
      </div>

      {state.kind === 'loading' && (
        <div aria-busy="true" className="grid gap-3">
          <span className="sr-only" role="status">
            Загружаем задания…
          </span>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl bg-foreground/10" data-testid="homework-skeleton" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>Не удалось загрузить задания</AlertTitle>
          <AlertDescription>
            <p>{state.message}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={retry}>
              <RotateCw aria-hidden="true" />
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {state.kind === 'ready' && isTutor && students.length === 0 && (
        <Alert>
          <AlertDescription>
            У вас пока нет учеников. Попросите ученика зарегистрироваться и добавьте его по email —
            после этого можно выдавать задания.
          </AlertDescription>
        </Alert>
      )}

      {state.kind === 'ready' && state.homework.length === 0 && (
        <Card className="items-center py-10 text-center">
          <CardHeader className="w-full items-center justify-items-center">
            <ClipboardList className="size-10 text-muted-foreground" aria-hidden="true" />
            <CardTitle>Пока нет заданий</CardTitle>
            <CardDescription>
              {isTutor
                ? 'Выдайте первое задание — оно появится здесь и у ученика.'
                : 'Когда репетитор выдаст задание, оно появится здесь.'}
            </CardDescription>
          </CardHeader>
          {canCreate && (
            <CardContent>
              <Button variant="outline" onClick={openDialog}>
                <Plus aria-hidden="true" />
                Выдать первое задание
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {state.kind === 'ready' && state.homework.length > 0 && <HomeworkList items={state.homework} />}

      {isTutor && (
        <HomeworkDialog
          key={dialogKey}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          students={students}
          onCreated={handleCreated}
        />
      )}
    </section>
  )
}
