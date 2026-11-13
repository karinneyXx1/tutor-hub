from conftest import PASSWORD, auth


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_register_login_me_logout(client):
    resp = client.post(
        "/api/auth/register",
        json={"email": "Ann@Example.com", "name": "Анна", "password": PASSWORD, "role": "tutor"},
    )
    assert resp.status_code == 201
    assert resp.json()["email"] == "ann@example.com"

    login = client.post("/api/auth/login", json={"email": "ann@example.com", "password": PASSWORD})
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['token']}"}

    me = client.get("/api/auth/me", headers=headers)
    assert me.json()["role"] == "tutor"

    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_register_duplicate_email(client, tutor):
    resp = client.post(
        "/api/auth/register",
        json={"email": "tutor@example.com", "name": "X", "password": PASSWORD, "role": "tutor"},
    )
    assert resp.status_code == 409


def test_register_validation(client):
    short = client.post(
        "/api/auth/register",
        json={"email": "a@example.com", "name": "A", "password": "123", "role": "student"},
    )
    blank_name = client.post(
        "/api/auth/register",
        json={"email": "b@example.com", "name": "   ", "password": PASSWORD, "role": "student"},
    )
    bad_role = client.post(
        "/api/auth/register",
        json={"email": "c@example.com", "name": "C", "password": PASSWORD, "role": "admin"},
    )
    assert short.status_code == blank_name.status_code == bad_role.status_code == 422


def test_login_wrong_password(client, tutor):
    resp = client.post("/api/auth/login", json={"email": "tutor@example.com", "password": "nope-nope"})
    assert resp.status_code == 401


def test_requires_token(client):
    assert client.get("/api/homework").status_code == 401
    assert client.get("/api/homework", headers={"Authorization": "Bearer bad"}).status_code == 401


def test_tutor_adds_student(client, tutor, student):
    students = client.get("/api/students", headers=auth(tutor)).json()
    assert [s["email"] for s in students] == ["student@example.com"]


def test_add_unknown_student(client, tutor):
    resp = client.post("/api/students", json={"email": "ghost@example.com"}, headers=auth(tutor))
    assert resp.status_code == 404


def test_student_cannot_list_students(client, student):
    assert client.get("/api/students", headers=auth(student)).status_code == 403
