"""Ученики репетитора."""

import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from ..db import get_db
from ..deps import require_tutor
from ..schemas import AddStudentIn, UserOut
from .auth import to_user

router = APIRouter(prefix="/api/students", tags=["students"])


@router.get("", response_model=list[UserOut])
def list_students(
    tutor: sqlite3.Row = Depends(require_tutor),
    db: sqlite3.Connection = Depends(get_db),
) -> list[UserOut]:
    rows = db.execute(
        """SELECT u.* FROM tutor_students ts JOIN users u ON u.id = ts.student_id
           WHERE ts.tutor_id = ? ORDER BY u.name""",
        (tutor["id"],),
    ).fetchall()
    return [to_user(r) for r in rows]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def add_student(
    data: AddStudentIn,
    tutor: sqlite3.Row = Depends(require_tutor),
    db: sqlite3.Connection = Depends(get_db),
) -> UserOut:
    student = db.execute(
        "SELECT * FROM users WHERE email = ? AND role = 'student'", (data.email.lower(),)
    ).fetchone()
    if student is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student with this email is not registered")
    db.execute(
        "INSERT OR IGNORE INTO tutor_students (tutor_id, student_id) VALUES (?, ?)",
        (tutor["id"], student["id"]),
    )
    db.commit()
    return to_user(student)
