PY ?= python3.12
VENV = backend/.venv

.PHONY: install run test clean

install:  ## Создать окружение и установить зависимости
	$(PY) -m venv $(VENV)
	$(VENV)/bin/pip install -r backend/requirements-dev.txt

run:  ## Запустить API на http://localhost:8000 (документация: /docs)
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

test:  ## Запустить тесты сервера
	cd backend && .venv/bin/pytest

clean:  ## Удалить локальную базу и кэши
	rm -f backend/*.sqlite3
	rm -rf backend/.pytest_cache
