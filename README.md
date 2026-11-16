# Код-репетитор

Сервис для репетитора и его учеников: репетитор выдаёт домашние задания и ставит уроки в расписание, ученик сдаёт ДЗ и получает оценку с комментарием.

## Возможности

**Репетитор**
- добавляет учеников по email;
- выдаёт ученику ДЗ: название, описание, срок;
- проверяет сданное ДЗ: ставит оценку от 1 до 5 с комментарием или возвращает на доработку;
- ставит уроки в расписание: дата и время, длительность, тема.

**Ученик**
- видит свои ДЗ и расписание;
- сдаёт ДЗ: текст ответа или код;
- видит оценку и комментарий; если ДЗ вернули, исправляет и сдаёт снова.

Статусы ДЗ:

```
assigned (выдано) → submitted (сдано) → checked (проверено)
                          ↘ returned (на доработке) → submitted → ...
```

## Стек

- **Сервер:** Python 3.12, FastAPI, SQLite
- **Интерфейс:** React 19 + TypeScript + Vite, стили Tailwind CSS
- **Библиотека компонентов:** [shadcn/ui](https://ui.shadcn.com) (стиль Nova, примитивы Radix UI, иконки Lucide). Тема — цвета, шрифт Geist, скругления — задана токенами в [`frontend/src/index.css`](frontend/src/index.css)
- **Тесты:** pytest (сервер); Vitest + React Testing Library + MSW (компоненты и формы); Playwright (сценарий в браузере). Все запускаются в GitHub Actions на каждый PR

## Запуск

Нужны Python 3.12 и Node.js 22+.

```bash
make install        # окружение Python, npm-зависимости, браузер для Playwright
make run            # API на http://localhost:8000, документация на /docs
make run-frontend   # интерфейс на http://localhost:5173 (во втором терминале)
make demo-data      # демо-вход: tutor@example.com / demo-password, два ученика
```

## Тесты

```bash
make test           # всё сразу
make test-backend   # pytest
make test-frontend  # Vitest: компоненты, формы, состояния (ответы сервера подменяет MSW)
make test-e2e       # Playwright: сценарий в браузере — с подменённым и с настоящим API
```

## Настройки

Переменные окружения сервера:

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `TUTOR_HUB_DB` | `tutor_hub.sqlite3` | путь к файлу базы |
| `TUTOR_HUB_CORS` | `http://localhost:5173` | разрешённые адреса интерфейса через запятую |

Интерфейса:

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | адрес API |

Секретов интерфейс не требует.

## Документация

- [docs/api.md](docs/api.md) — эндпоинты API
- [docs/architecture.md](docs/architecture.md) — устройство проекта
- [docs/frontend-spec.md](docs/frontend-spec.md) — поведение интерфейса
- [CONTRIBUTING.md](CONTRIBUTING.md) — как сообщить о проблеме или предложить изменение
- [AGENTS.md](AGENTS.md) — правила для AI-агентов
