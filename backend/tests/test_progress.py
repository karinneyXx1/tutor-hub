from conftest import auth, register_and_login, tomorrow


def assign(client, tutor, student, title="ДЗ"):
    resp = client.post(
        "/api/homework",
        json={"student_id": student["id"], "title": title, "due_date": tomorrow()},
        headers=auth(tutor),
    )
    return resp.json()["id"]


def test_empty_progress(client, student):
    body = client.get("/api/progress", headers=auth(student)).json()
    assert body["total"] == 0
    assert body["average_grade"] is None


def test_progress_counts_and_average(client, tutor, student):
    ids = [assign(client, tutor, student, f"ДЗ {i}") for i in range(3)]
    for hid in ids[:2]:
        client.post(f"/api/homework/{hid}/submit", json={"answer": "ok"}, headers=auth(student))
    client.post(f"/api/homework/{ids[0]}/review", json={"grade": 5}, headers=auth(tutor))
    client.post(f"/api/homework/{ids[1]}/review", json={"grade": 4}, headers=auth(tutor))

    body = client.get("/api/progress", params={"student_id": student["id"]}, headers=auth(tutor)).json()
    assert (body["total"], body["checked"], body["assigned"]) == (3, 2, 1)
    assert body["average_grade"] == 4.5
    assert body["student_name"] == "Маша"


def test_overdue(client, tutor, student):
    hid = assign(client, tutor, student)
    # срок в прошлом нельзя поставить через API, поэтому меняем его в базе напрямую
    from app.db import connect

    conn = connect()
    conn.execute("UPDATE homework SET due_date = '2000-01-01' WHERE id = ?", (hid,))
    conn.commit()
    conn.close()

    body = client.get("/api/progress", headers=auth(student)).json()
    assert body["overdue"] == 1


def test_tutor_needs_student_id(client, tutor):
    assert client.get("/api/progress", headers=auth(tutor)).status_code == 422


def test_tutor_cannot_see_foreign_student(client, tutor):
    stranger = register_and_login(client, "other@example.com", "student")
    resp = client.get("/api/progress", params={"student_id": stranger["id"]}, headers=auth(tutor))
    assert resp.status_code == 404


def test_student_sees_only_own(client, tutor, student):
    assign(client, tutor, student)
    stranger = register_and_login(client, "other@example.com", "student")
    body = client.get("/api/progress", params={"student_id": student["id"]}, headers=auth(stranger)).json()
    assert body["student_id"] == stranger["id"]
    assert body["total"] == 0
