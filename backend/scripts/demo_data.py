"""Демо-данные для ручной проверки интерфейса: репетитор и два ученика.

Запуск (сервер должен работать): python backend/scripts/demo_data.py [http://localhost:8000]
Повторный запуск безопасен: уже зарегистрированные пользователи пропускаются.
"""

import json
import sys
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
for student in STUDENTS:
    call("POST", "/api/students", {"email": student["email"]}, token)

print(f"\nВход в интерфейс: {TUTOR['email']} / {PASSWORD}")
