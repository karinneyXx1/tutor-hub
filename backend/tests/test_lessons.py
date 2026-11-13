from conftest import auth, register_and_login


def lesson(student_id: int, starts_at: str = "2030-01-10T15:00:00", **extra) -> dict:
    return {"student_id": student_id, "starts_at": starts_at, "duration_min": 60, "topic": "Списки", **extra}


def test_create_and_list_sorted(client, tutor, student):
    client.post("/api/lessons", json=lesson(student["id"], "2030-01-12T10:00:00"), headers=auth(tutor))
    client.post("/api/lessons", json=lesson(student["id"], "2030-01-10T10:00:00"), headers=auth(tutor))

    for user in (tutor, student):
        items = client.get("/api/lessons", headers=auth(user)).json()
        assert [i["starts_at"][:10] for i in items] == ["2030-01-10", "2030-01-12"]


def test_lesson_validation(client, tutor, student):
    too_short = client.post("/api/lessons", json=lesson(student["id"], duration_min=5), headers=auth(tutor))
    blank_topic = client.post("/api/lessons", json=lesson(student["id"], topic=" "), headers=auth(tutor))
    assert too_short.status_code == blank_topic.status_code == 422


def test_foreign_student(client, tutor):
    stranger = register_and_login(client, "other@example.com", "student")
    resp = client.post("/api/lessons", json=lesson(stranger["id"]), headers=auth(tutor))
    assert resp.status_code == 404


def test_delete_lesson(client, tutor, student):
    created = client.post("/api/lessons", json=lesson(student["id"]), headers=auth(tutor)).json()
    assert client.delete(f"/api/lessons/{created['id']}", headers=auth(student)).status_code == 403
    assert client.delete(f"/api/lessons/{created['id']}", headers=auth(tutor)).status_code == 204
    assert client.get("/api/lessons", headers=auth(tutor)).json() == []
