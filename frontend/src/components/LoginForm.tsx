import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useSingleFlight } from '@/hooks/useSingleFlight'
import { api, ApiError, type LoginResponse } from '@/lib/api'
import { focusFirstError, hasErrors, validateLogin, type Errors, type LoginValues } from '@/lib/validation'

interface Props {
  onLogin: (result: LoginResponse) => void
}

export function LoginForm({ onLogin }: Props) {
  const [values, setValues] = useState<LoginValues>({ email: '', password: '' })
  const [errors, setErrors] = useState<Errors<keyof LoginValues>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const { pending, run } = useSingleFlight()

  const update = (key: keyof LoginValues, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateLogin(values)
    setErrors(found)
    if (hasErrors(found)) {
      focusFirstError(found, { email: 'login-email', password: 'login-password' })
      return
    }

    void run(async () => {
      setServerError(null)
      try {
        onLogin(await api.login(values.email.trim(), values.password))
      } catch (error) {
        setServerError(error instanceof ApiError ? error.message : 'Не удалось войти')
      }
    })
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">Вход</h1>
        </CardTitle>
        <CardDescription>Войдите, чтобы выдавать и проверять домашние задания</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit} aria-label="Вход">
          <FieldGroup>
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(e) => update('email', e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
              />
              {errors.email && <FieldError id="login-email-error">{errors.email}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="login-password">Пароль</FieldLabel>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={values.password}
                onChange={(e) => update('password', e.target.value)}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
              />
              {errors.password && (
                <FieldError id="login-password-error">{errors.password}</FieldError>
              )}
            </Field>
            <Button type="submit" size="lg" disabled={pending} className="w-full">
              {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              {pending ? 'Входим…' : 'Войти'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
