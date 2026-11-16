import { useCallback, useEffect, useState } from 'react'
import { CircleCheck, ClipboardList, Plus, RotateCw, TriangleAlert } from 'lucide-react'

import { HomeworkDialog } from '@/components/HomeworkDialog'
import { HomeworkList } from '@/components/HomeworkList'
import { HomeworkStats } from '@/components/HomeworkStats'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
    <section aria-labelledby="homework-heading" className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 id="homework-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Домашние задания
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isTutor ? 'Задания, которые вы выдали ученикам' : 'Задания от вашего репетитора'}
          </p>
        </div>
        {isTutor && (
          <Button
            size="lg"
            onClick={openDialog}
            disabled={!canCreate}
            className="self-start shadow-lg shadow-primary/30 sm:self-auto"
          >
            <Plus aria-hidden="true" />
            Выдать задание
          </Button>
        )}
      </div>

      <div role="status" aria-live="polite" className="empty:hidden">
        {success && (
          <Alert className="border-success/30 bg-success/10 text-success">
            <CircleCheck aria-hidden="true" />
            <AlertDescription className="text-success">{success}</AlertDescription>
          </Alert>
        )}
      </div>

      {state.kind === 'loading' && (
        <div aria-busy="true" className="grid gap-6">
          <span className="sr-only" role="status">
            Загружаем задания…
          </span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[5.5rem] rounded-xl bg-foreground/10" />
            ))}
          </div>
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                data-testid="homework-skeleton"
                className="relative grid gap-3 overflow-hidden rounded-xl bg-card p-4 pl-5 ring-1 ring-foreground/10"
              >
                <Skeleton className="absolute inset-y-0 left-0 w-1 rounded-none bg-foreground/15" />
                <div className="flex justify-between gap-4">
                  <Skeleton className="h-5 w-1/2 bg-foreground/10" />
                  <Skeleton className="h-6 w-20 rounded-full bg-foreground/10" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-6 rounded-full bg-foreground/10" />
                  <Skeleton className="h-4 w-40 bg-foreground/10" />
                  <Skeleton className="h-4 w-32 bg-foreground/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.kind === 'error' && (
        <Card className="items-center py-10 text-center">
          <CardHeader className="w-full justify-items-center gap-3">
            <span className="grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
              <TriangleAlert className="size-6" aria-hidden="true" />
            </span>
            <div role="alert" className="grid gap-1">
              <CardTitle className="text-lg">Не удалось загрузить задания</CardTitle>
              <CardDescription>{state.message}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="lg" onClick={retry}>
              <RotateCw aria-hidden="true" />
              Повторить
            </Button>
          </CardContent>
        </Card>
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
        <Card className="items-center py-14 text-center">
          <CardHeader className="w-full justify-items-center gap-4">
            <span className="grid size-16 place-items-center rounded-full bg-primary/10 text-status-assigned shadow-[0_0_40px_-4px] shadow-primary/50 ring-1 ring-primary/40">
              <ClipboardList className="size-7" aria-hidden="true" />
            </span>
            <CardTitle className="text-xl">Пока нет заданий</CardTitle>
            <CardDescription className="max-w-sm text-base">
              {isTutor
                ? 'Выдайте первое задание — оно появится здесь и у ученика'
                : 'Когда репетитор выдаст задание, оно появится здесь'}
            </CardDescription>
          </CardHeader>
          {canCreate && (
            <CardContent>
              <Button size="lg" onClick={openDialog} className="shadow-lg shadow-primary/30">
                <Plus aria-hidden="true" />
                Выдать первое задание
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {state.kind === 'ready' && state.homework.length > 0 && (
        <>
          <HomeworkStats items={state.homework} />
          <HomeworkList items={state.homework} />
        </>
      )}

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
