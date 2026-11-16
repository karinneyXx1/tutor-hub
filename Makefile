PY ?= python3.12
VENV = backend/.venv

.PHONY: install install-backend install-frontend run run-frontend demo-data test test-backend test-frontend test-e2e clean

install: install-backend install-frontend  ## Установить всё: сервер и интерфейс

install-backend:  ## Окружение Python и зависимости сервера
	$(PY) -m venv $(VENV)
	$(VENV)/bin/pip install -r backend/requirements-dev.txt

install-frontend:  ## Зависимости интерфейса и браузер для Playwright
	cd frontend && npm ci && npx playwright install chromium

run:  ## Запустить API на http://localhost:8000 (документация: /docs)
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

run-frontend:  ## Запустить интерфейс на http://localhost:5173 (API должен работать)
	cd frontend && npm run dev

demo-data:  ## Демо-пользователи: tutor@example.com / demo-password и два ученика (API должен работать)
	$(VENV)/bin/python backend/scripts/demo_data.py

test: test-backend test-frontend test-e2e  ## Все тесты

test-backend:  ## Тесты сервера (pytest)
	cd backend && .venv/bin/pytest

test-frontend:  ## Тесты компонентов и форм (Vitest + Testing Library + MSW)
	cd frontend && npm test

test-e2e:  ## Браузерные тесты (Playwright): сценарий с подменённым и с настоящим API
	cd frontend && npm run test:e2e

clean:  ## Удалить локальную базу и кэши
	rm -f backend/*.sqlite3
	rm -rf backend/.pytest_cache frontend/test-results frontend/playwright-report
