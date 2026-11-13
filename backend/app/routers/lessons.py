"""Расписание уроков."""

import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from ..db import get_db
from ..deps import current_user, ensure_own_student, require_tutor
from ..schemas import LessonIn, LessonOut

router = APIRouter(prefix="/api/lessons", tags=["lessons"])

_SELECT = """SELECT l.*, s.name AS student_name
             FROM lessons l JOIN users s ON s.id = l.student_id"""


@router.post("", response_model=LessonOut, status_code=status.HTTP_201_CREATED)
def create_lesson(
    data: LessonIn,
    tutor: sqlite3.Row = Depends(require_tutor),
    db: sqlite3.Connection = Depends(get_db),
) -> LessonOut:
    ensure_own_student(db, tutor["id"], data.student_id)
    cur = db.execute(
        "INSERT INTO lessons (tutor_id, student_id, starts_at, duration_min, topic) VALUES (?, ?, ?, ?, ?)",
        (tutor["id"], data.student_id, data.starts_at.isoformat(), data.duration_min, data.topic),
    )
    db.commit()
    row = db.execute(f"{_SELECT} WHERE l.id = ?", (cur.lastrowid,)).fetchone()
    return LessonOut(**dict(row))


@router.get("", response_model=list[LessonOut])
def list_lessons(
    user: sqlite3.Row = Depends(current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> list[LessonOut]:
    owner_column = "l.tutor_id" if user["role"] == "tutor" else "l.student_id"
    rows = db.execute(
        f"{_SELECT} WHERE {owner_column} = ? ORDER BY l.starts_at", (user["id"],)
    ).fetchall()
    return [LessonOut(**dict(r)) for r in rows]


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    lesson_id: int,
    tutor: sqlite3.Row = Depends(require_tutor),
    db: sqlite3.Connection = Depends(get_db),
) -> None:
    deleted = db.execute(
        "DELETE FROM lessons WHERE id = ? AND tutor_id = ?", (lesson_id, tutor["id"])
    ).rowcount
    db.commit()
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found")
