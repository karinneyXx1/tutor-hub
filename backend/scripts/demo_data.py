"""Демо-данные для ручной проверки интерфейса: репетитор, два ученика и задания во всех статусах.

Запуск (сервер должен работать): python backend/scripts/demo_data.py [http://localhost:8000]
Повторный запуск безопасен: уже зарегистрированные пользователи пропускаются.
"""

import json
import sys
from datetime import date, timedelta
import urllib.error
import urllib.request

API = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000").rstrip("/")
PASSWORD = "demo-password"
TUTOR = {"email": "tutor@example.com", "name": "Мария Иванова", "role": "tutor"}
STUDENTS = [
    {"email": "anna@example.com", "name": "Анна Смирнова", "role": "student"},
    {"email": "ivan@example.com", "name": "Иван Петров", "role": "student"},
]


def call(method: str, path: str, body: dict | None = None, token: str | None = None) -> dict:
    req = urllib.request.Request(
        f"{API}{path}",
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})},
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read() or b"{}")


def register(user: dict) -> None:
    try:
        call("POST", "/api/auth/register", {**user, "password": PASSWORD})
        print(f"зарегистрирован {user['email']}")
    except urllib.error.HTTPError as err:
        if err.code != 409:
            raise
        print(f"уже есть {user['email']}")


for user in [TUTOR, *STUDENTS]:
    register(user)

token = call("POST", "/api/auth/login", {"email": TUTOR["email"], "password": PASSWORD})["token"]
student_ids = {}
for student in STUDENTS:
    student_ids[student["email"]] = call("POST", "/api/students", {"email": student["email"]}, token)["id"]

# Задания создаём только один раз — если у репетитора уже есть ДЗ, ничего не добавляем.
if not call("GET", "/api/homework", token=token):
    anna, ivan = (student_ids[s["email"]] for s in STUDENTS)
    due = lambda days: (date.today() + timedelta(days=days)).isoformat()  # noqa: E731

    def assign(student_id: int, title: str, description: str, days: int) -> int:
        body = {"student_id": student_id, "title": title, "description": description, "due_date": due(days)}
        return call("POST", "/api/homework", body, token)["id"]

    def as_student(email: str) -> str:
        return call("POST", "/api/auth/login", {"email": email, "password": PASSWORD})["token"]

    assign(anna, "Циклы for и while в Python", "Решить 6 задач на циклы: таблица умножения, сумма цифр числа.", 5)
    submitted = assign(ivan, "Вёрстка карточки товара на Flexbox", "Сверстать адаптивную карточку, ссылка на CodePen.", 3)
    returned = assign(anna, "Рекурсия: числа Фибоначчи", "Переписать решение с мемоизацией.", 2)
    checked = assign(ivan, "Массивы и методы map / filter", "", 1)

    anna_token, ivan_token = as_student(STUDENTS[0]["email"]), as_student(STUDENTS[1]["email"])
    call("POST", f"/api/homework/{submitted}/submit", {"answer": "https://codepen.io/demo"}, ivan_token)
    call("POST", f"/api/homework/{returned}/submit", {"answer": "def fib(n): ..."}, anna_token)
    call("POST", f"/api/homework/{returned}/return", {"feedback": "Добавьте мемоизацию"}, token)
    call("POST", f"/api/homework/{checked}/submit", {"answer": "const evens = xs.filter(...)"}, ivan_token)
    call("POST", f"/api/homework/{checked}/review", {"grade": 5, "feedback": "Отлично"}, token)
    print("созданы 4 задания во всех статусах")

print(f"\nВход в интерфейс: {TUTOR['email']} / {PASSWORD}")
