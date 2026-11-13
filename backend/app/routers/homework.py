"""Домашние задания: выдать, сдать, проверить, вернуть на доработку.

Статусы: assigned → submitted → checked
                         ↘ returned → submitted → ...
"""

import sqlite3
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..db import get_db
from ..deps import current_user, ensure_own_student, require_student, require_tutor
from ..schemas import HomeworkIn, HomeworkOut, HomeworkStatus, ReturnIn, ReviewIn, SubmitIn

router = APIRouter(prefix="/api/homework", tags=["homework"])

_SELECT = """SELECT h.*, s.name AS student_name
             FROM homework h JOIN users s ON s.id = h.student_id"""


def _get_visible(db: sqlite3.Connection, user: sqlite3.Row, homework_id: int) -> sqlite3.Row:
    """ДЗ видно только его репетитору и его ученику."""
    row = db.execute(f"{_SELECT} WHERE h.id = ?", (homework_id,)).fetchone()
    if row is None or user["id"] not in (row["tutor_id"], row["student_id"]):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Homework not found")
    return row


def _to_out(row: sqlite3.Row) -> HomeworkOut:
    return HomeworkOut(**dict(row))


@router.post("", response_model=HomeworkOut, status_code=status.HTTP_201_CREATED)
def create_homework(
    data: HomeworkIn,
    tutor: sqlite3.Row = Depends(require_tutor),
    db: sqlite3.Connection = Depends(get_db),
) -> HomeworkOut:
    ensure_own_student(db, tutor["id"], data.student_id)
    if data.due_date < date.today():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Due date is in the past")
    cur = db.execute(
        """INSERT INTO homework (tutor_id, student_id, title, description, due_date)
           VALUES (?, ?, ?, ?, ?)""",
        (tutor["id"], data.student_id, data.title, data.description, data.due_date.isoformat()),
    )
    db.commit()
    return _to_out(_get_visible(db, tutor, cur.lastrowid))


@router.get("", response_model=list[HomeworkOut])
def list_homework(
    status_filter: HomeworkStatus | None = Query(default=None, alias="status"),
    user: sqlite3.Row = Depends(current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> list[HomeworkOut]:
    owner_column = "h.tutor_id" if user["role"] == "tutor" else "h.student_id"
    sql = f"{_SELECT} WHERE {owner_column} = ?"
    params: list = [user["id"]]
    if status_filter:
        sql += " AND h.status = ?"
        params.append(status_filter)
    sql += " ORDER BY h.due_date, h.id"
    return [_to_out(r) for r in db.execute(sql, params).fetchall()]


@router.get("/{homework_id}", response_model=HomeworkOut)
def get_homework(
    homework_id: int,
    user: sqlite3.Row = Depends(current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> HomeworkOut:
    return _to_out(_get_visible(db, user, homework_id))


@router.post("/{homework_id}/submit", response_model=HomeworkOut)
def submit_homework(
    homework_id: int,
    data: SubmitIn,
    student: sqlite3.Row = Depends(require_student),
    db: sqlite3.Connection = Depends(get_db),
) -> HomeworkOut:
    row = _get_visible(db, student, homework_id)
    if row["status"] == "submitted":
        raise HTTPException(status.HTTP_409_CONFLICT, "Homework cannot be submitted now")
    db.execute(
        """UPDATE homework SET status = 'submitted', answer = ?, submitted_at = datetime('now')
           WHERE id = ?""",
        (data.answer, homework_id),
    )
    db.commit()
    return _to_out(_get_visible(db, student, homework_id))


@router.post("/{homework_id}/review", response_model=HomeworkOut)
def review_homework(
    homework_id: int,
    data: ReviewIn,
    tutor: sqlite3.Row = Depends(require_tutor),
    db: sqlite3.Connection = Depends(get_db),
) -> HomeworkOut:
    row = _get_visible(db, tutor, homework_id)
    if row["status"] != "submitted":
        raise HTTPException(status.HTTP_409_CONFLICT, "Only submitted homework can be reviewed")
    db.execute(
        """UPDATE homework SET status = 'checked', grade = ?, feedback = ?, checked_at = datetime('now')
           WHERE id = ?""",
        (data.grade, data.feedback, homework_id),
    )
    db.commit()
    return _to_out(_get_visible(db, tutor, homework_id))


@router.post("/{homework_id}/return", response_model=HomeworkOut)
def return_homework(
    homework_id: int,
    data: ReturnIn,
    tutor: sqlite3.Row = Depends(require_tutor),
    db: sqlite3.Connection = Depends(get_db),
) -> HomeworkOut:
    row = _get_visible(db, tutor, homework_id)
    if row["status"] != "submitted":
        raise HTTPException(status.HTTP_409_CONFLICT, "Only submitted homework can be returned")
    db.execute(
        "UPDATE homework SET status = 'returned', feedback = ? WHERE id = ?",
        (data.feedback, homework_id),
    )
    db.commit()
    return _to_out(_get_visible(db, tutor, homework_id))
