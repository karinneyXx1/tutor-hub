"""Прогресс ученика по домашним заданиям."""

import sqlite3
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..db import get_db
from ..deps import current_user, ensure_own_student
from ..schemas import ProgressOut

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("", response_model=ProgressOut)
def get_progress(
    student_id: int | None = Query(default=None),
    user: sqlite3.Row = Depends(current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> ProgressOut:
    """Ученик видит свой прогресс; репетитор — прогресс своего ученика по student_id."""
    if user["role"] == "student":
        student_id = user["id"]
    elif student_id is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "student_id is required")
    else:
        ensure_own_student(db, user["id"], student_id)

    student = db.execute("SELECT name FROM users WHERE id = ?", (student_id,)).fetchone()
    rows = db.execute(
        "SELECT status, due_date, grade FROM homework WHERE student_id = ?", (student_id,)
    ).fetchall()

    counts = {"assigned": 0, "submitted": 0, "returned": 0, "checked": 0}
    overdue = 0
    grades = []
    today = date.today().isoformat()
    for row in rows:
        counts[row["status"]] += 1
        if row["status"] in ("assigned", "returned") and row["due_date"] < today:
            overdue += 1
        if row["grade"] is not None:
            grades.append(row["grade"])

    return ProgressOut(
        student_id=student_id,
        student_name=student["name"],
        total=len(rows),
        overdue=overdue,
        average_grade=round(sum(grades) / len(grades), 2) if grades else None,
        **counts,
    )
