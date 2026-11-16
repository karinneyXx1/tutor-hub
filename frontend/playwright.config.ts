import { defineConfig, devices } from '@playwright/test'

// Python с зависимостями бэкенда: локально — backend/.venv (make install), в CI — системный.
const python = process.env.PYTHON ?? '.venv/bin/python'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'ru-RU',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], locale: 'ru-RU' } }],
  webServer: [
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
    {
      // Настоящий API для e2e/real-api.spec.ts; отдельная база, чтобы не трогать рабочую.
      command: `${python} -m uvicorn app.main:app --port 8000`,
      cwd: '../backend',
      env: { TUTOR_HUB_DB: 'e2e.sqlite3' },
      url: 'http://localhost:8000/api/health',
      reuseExistingServer: !process.env.CI,
    },
  ],
})
