import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'

import { LoginForm } from '@/components/LoginForm'
import { Logo } from '@/components/Logo'
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

  if (!user) {
    return (
      <main className="grid min-h-svh place-items-center bg-background bg-glow-center px-4 py-10">
        {restoring ? (
          <p role="status" className="text-sm text-muted-foreground">
            Загружаем…
          </p>
        ) : (
          <LoginForm onLogin={handleLogin} />
        )}
      </main>
    )
  }

  return (
    <div className="min-h-svh bg-background bg-glow bg-no-repeat">
      <header className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{user.name}</span>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut aria-hidden="true" />
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <HomeworkPage user={user} />
      </main>
    </div>
  )
}
