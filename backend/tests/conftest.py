from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app

PASSWORD = "secret-pass-123"


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("TUTOR_HUB_DB", str(tmp_path / "test.sqlite3"))
    with TestClient(app) as c:
        yield c


def register_and_login(client: TestClient, email: str, role: str, name: str = "User") -> dict:
    client.post(
        "/api/auth/register",
        json={"email": email, "name": name, "password": PASSWORD, "role": role},
    )
    resp = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    data = resp.json()
    return {"Authorization": f"Bearer {data['token']}", "id": data["user"]["id"]}


@pytest.fixture
def tutor(client):
    return register_and_login(client, "tutor@example.com", "tutor", "Анна Петровна")


@pytest.fixture
def student(client, tutor):
    s = register_and_login(client, "student@example.com", "student", "Маша")
    client.post("/api/students", json={"email": "student@example.com"}, headers=auth(tutor))
    return s


def auth(user: dict) -> dict:
    return {"Authorization": user["Authorization"]}


def tomorrow() -> str:
    return (date.today() + timedelta(days=1)).isoformat()


@pytest.fixture
def homework(client, tutor, student):
    resp = client.post(
        "/api/homework",
        json={
            "student_id": student["id"],
            "title": "Циклы",
            "description": "Задачи 1-5",
            "due_date": tomorrow(),
        },
        headers=auth(tutor),
    )
    return resp.json()
