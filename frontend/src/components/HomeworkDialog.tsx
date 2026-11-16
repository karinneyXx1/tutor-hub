import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useSingleFlight } from '@/hooks/useSingleFlight'
import { api, ApiError, type Homework, type User } from '@/lib/api'
import {
  focusFirstError,
  hasErrors,
  todayISO,
  validateHomework,
  TITLE_MAX,
  type Errors,
  type HomeworkValues,
} from '@/lib/validation'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  students: User[]
  onCreated: (homework: Homework) => void
}

const FIELD_IDS: Record<keyof HomeworkValues, string> = {
  studentId: 'hw-student',
  title: 'hw-title',
  description: 'hw-description',
  dueDate: 'hw-due',
}

const EMPTY: HomeworkValues = { studentId: '', title: '', description: '', dueDate: '' }

export function HomeworkDialog({ open, onOpenChange, students, onCreated }: Props) {
  // Страница монтирует диалог заново при каждом открытии (key), поэтому форма всегда чистая.
  const [values, setValues] = useState<HomeworkValues>(() => ({
    ...EMPTY,
    studentId: students.length === 1 ? String(students[0].id) : '',
  }))
  const [errors, setErrors] = useState<Errors<keyof HomeworkValues>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const { pending, run } = useSingleFlight()

  const handleOpenChange = (next: boolean) => {
    if (pending) return // пока идёт сохранение, диалог не закрываем
    onOpenChange(next)
  }

  const update = (key: keyof HomeworkValues, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateHomework(values)
    setErrors(found)
    if (hasErrors(found)) {
      focusFirstError(found, FIELD_IDS)
      return
    }

    void run(async () => {
      setServerError(null)
      try {
        const created = await api.createHomework({
          student_id: Number(values.studentId),
          title: values.title.trim(),
          description: values.description.trim(),
          due_date: values.dueDate,
        })
        onCreated(created)
        onOpenChange(false)
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Не удалось сохранить'
        // Введённые данные остаются в форме — их можно исправить и отправить снова.
        if (error instanceof ApiError && error.status === 422 && /прошлом/.test(message)) {
          setErrors({ dueDate: message })
        } else if (error instanceof ApiError && error.status === 404) {
          setErrors({ studentId: message })
        } else {
          setServerError(message)
        }
      }
    })
  }

  const fieldProps = (key: keyof HomeworkValues, id: string) => ({
    id,
    'aria-invalid': !!errors[key],
    'aria-describedby': errors[key] ? `${id}-error` : undefined,
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Новое домашнее задание</DialogTitle>
          <DialogDescription>Ученик увидит задание в своём кабинете.</DialogDescription>
        </DialogHeader>

        <form id="homework-form" noValidate onSubmit={handleSubmit} aria-label="Новое домашнее задание">
          <FieldGroup className="gap-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <Field data-invalid={!!errors.studentId}>
              <FieldLabel htmlFor="hw-student">Ученик</FieldLabel>
              <NativeSelect
                className="w-full"
                value={values.studentId}
                onChange={(e) => update('studentId', e.target.value)}
                {...fieldProps('studentId', 'hw-student')}
              >
                <NativeSelectOption value="">— не выбран —</NativeSelectOption>
                {students.map((s) => (
                  <NativeSelectOption key={s.id} value={String(s.id)}>
                    {s.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {errors.studentId && <FieldError id="hw-student-error">{errors.studentId}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="hw-title">Название</FieldLabel>
              <Input
                value={values.title}
                maxLength={TITLE_MAX + 1}
                onChange={(e) => update('title', e.target.value)}
                {...fieldProps('title', 'hw-title')}
              />
              {errors.title && <FieldError id="hw-title-error">{errors.title}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="hw-description">
                Описание <span className="font-normal text-muted-foreground">(необязательно)</span>
              </FieldLabel>
              <Textarea
                rows={3}
                value={values.description}
                onChange={(e) => update('description', e.target.value)}
                {...fieldProps('description', 'hw-description')}
              />
              {errors.description && (
                <FieldError id="hw-description-error">{errors.description}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!errors.dueDate}>
              <FieldLabel htmlFor="hw-due">Срок сдачи</FieldLabel>
              <Input
                type="date"
                min={todayISO()}
                value={values.dueDate}
                onChange={(e) => update('dueDate', e.target.value)}
                {...fieldProps('dueDate', 'hw-due')}
              />
              {errors.dueDate ? (
                <FieldError id="hw-due-error">{errors.dueDate}</FieldError>
              ) : (
                <FieldDescription>Не раньше сегодняшнего дня</FieldDescription>
              )}
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter className="-mx-6 -mb-6 px-6">
          <DialogClose asChild>
            <Button variant="outline" size="lg" disabled={pending}>
              Отмена
            </Button>
          </DialogClose>
          <Button type="submit" form="homework-form" size="lg" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            {pending ? 'Сохраняем…' : 'Выдать задание'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
