import { useEffect, useState } from 'react'
import { GraduationCap, LogOut } from 'lucide-react'

import { LoginForm } from '@/components/LoginForm'
import { Button } from '@/components/ui/button'
import { api, setToken, type LoginResponse, type User } from '@/lib/api'
import { HomeworkPage } from '@/pages/HomeworkPage'

const TOKEN_KEY = 'tutor-hub-token'

const storage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (value: string | null) => {
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* хранилище недоступно — сессия живёт до перезагрузки страницы */
    }
  },
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [restoring, setRestoring] = useState(() => storage.get() !== null)

  // Восстанавливаем сессию после перезагрузки страницы.
  useEffect(() => {
    const saved = storage.get()
    if (!saved) return
    setToken(saved)
    api
      .me()
      .then(setUser)
      .catch(() => {
        setToken(null)
        storage.set(null)
      })
      .finally(() => setRestoring(false))
  }, [])

  const handleLogin = ({ token, user }: LoginResponse) => {
    setToken(token)
    storage.set(token)
    setUser(user)
  }

  const handleLogout = () => {
    void api.logout().catch(() => undefined)
    setToken(null)
    storage.set(null)
    setUser(null)
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <GraduationCap className="size-6 text-primary" aria-hidden="true" />
            <span>Код-репетитор</span>
          </div>
          {user && (
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-muted-foreground sm:inline">{user.name}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut aria-hidden="true" />
                Выйти
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {restoring ? (
          <p role="status" className="text-sm text-muted-foreground">
            Загружаем…
          </p>
        ) : user ? (
          <HomeworkPage user={user} />
        ) : (
          <div className="flex justify-center pt-8">
            <LoginForm onLogin={handleLogin} />
          </div>
        )}
      </main>
    </div>
  )
}
