from conftest import auth, register_and_login, tomorrow


def test_create_and_list(client, tutor, student, homework):
    assert homework["status"] == "assigned"
    assert homework["student_name"] == "Маша"

    for user in (tutor, student):
        items = client.get("/api/homework", headers=auth(user)).json()
        assert [h["id"] for h in items] == [homework["id"]]


def test_create_validation(client, tutor, student):
    past = client.post(
        "/api/homework",
        json={"student_id": student["id"], "title": "X", "due_date": "2000-01-01"},
        headers=auth(tutor),
    )
    blank = client.post(
        "/api/homework",
        json={"student_id": student["id"], "title": "  ", "due_date": tomorrow()},
        headers=auth(tutor),
    )
    assert past.status_code == blank.status_code == 422


def test_cannot_assign_to_foreign_student(client, tutor):
    stranger = register_and_login(client, "other@example.com", "student")
    resp = client.post(
        "/api/homework",
        json={"student_id": stranger["id"], "title": "X", "due_date": tomorrow()},
        headers=auth(tutor),
    )
    assert resp.status_code == 404


def test_student_cannot_create(client, student):
    resp = client.post(
        "/api/homework",
        json={"student_id": student["id"], "title": "X", "due_date": tomorrow()},
        headers=auth(student),
    )
    assert resp.status_code == 403


def test_submit_and_review(client, tutor, student, homework):
    hid = homework["id"]
    submitted = client.post(f"/api/homework/{hid}/submit", json={"answer": "print(1)"}, headers=auth(student))
    assert submitted.json()["status"] == "submitted"
    assert submitted.json()["answer"] == "print(1)"

    reviewed = client.post(
        f"/api/homework/{hid}/review", json={"grade": 5, "feedback": "Отлично"}, headers=auth(tutor)
    )
    body = reviewed.json()
    assert (body["status"], body["grade"], body["feedback"]) == ("checked", 5, "Отлично")


def test_cannot_resubmit_checked_homework(client, tutor, student, homework):
    hid = homework["id"]
    client.post(f"/api/homework/{hid}/submit", json={"answer": "v1"}, headers=auth(student))
    client.post(f"/api/homework/{hid}/review", json={"grade": 5, "feedback": "ok"}, headers=auth(tutor))

    resubmit = client.post(f"/api/homework/{hid}/submit", json={"answer": "v2"}, headers=auth(student))
    assert resubmit.status_code == 409

    # Оценка и статус не должны быть затёрты попыткой повторной сдачи
    hw = client.get(f"/api/homework/{hid}", headers=auth(student)).json()
    assert hw["status"] == "checked"
    assert hw["grade"] == 5


def test_return_and_resubmit(client, tutor, student, homework):
    hid = homework["id"]
    client.post(f"/api/homework/{hid}/submit", json={"answer": "v1"}, headers=auth(student))
    returned = client.post(f"/api/homework/{hid}/return", json={"feedback": "Добавь тесты"}, headers=auth(tutor))
    assert returned.json()["status"] == "returned"

    resubmitted = client.post(f"/api/homework/{hid}/submit", json={"answer": "v2"}, headers=auth(student))
    assert resubmitted.json()["status"] == "submitted"
    assert resubmitted.json()["answer"] == "v2"


def test_review_requires_submitted(client, tutor, homework):
    resp = client.post(f"/api/homework/{homework['id']}/review", json={"grade": 4}, headers=auth(tutor))
    assert resp.status_code == 409


def test_submit_validation(client, student, homework):
    resp = client.post(f"/api/homework/{homework['id']}/submit", json={"answer": "   "}, headers=auth(student))
    assert resp.status_code == 422


def test_grade_range(client, tutor, student, homework):
    hid = homework["id"]
    client.post(f"/api/homework/{hid}/submit", json={"answer": "v1"}, headers=auth(student))
    resp = client.post(f"/api/homework/{hid}/review", json={"grade": 6}, headers=auth(tutor))
    assert resp.status_code == 422


def test_filter_by_status(client, tutor, student, homework):
    client.post(f"/api/homework/{homework['id']}/submit", json={"answer": "v1"}, headers=auth(student))
    submitted = client.get("/api/homework?status=submitted", headers=auth(tutor)).json()
    assigned = client.get("/api/homework?status=assigned", headers=auth(tutor)).json()
    assert len(submitted) == 1 and assigned == []


def test_other_student_cannot_see(client, homework):
    stranger = register_and_login(client, "other@example.com", "student")
    assert client.get(f"/api/homework/{homework['id']}", headers=auth(stranger)).status_code == 404
    assert client.get("/api/homework", headers=auth(stranger)).json() == []
