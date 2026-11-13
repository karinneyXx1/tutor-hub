"""Общие зависимости: текущий пользователь и проверка роли."""

import sqlite3

from fastapi import Depends, Header, HTTPException, status

from .db import get_db


def current_user(
    authorization: str | None = Header(default=None),
    db: sqlite3.Connection = Depends(get_db),
) -> sqlite3.Row:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    token = authorization.removeprefix("Bearer ")
    user = db.execute(
        "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?",
        (token,),
    ).fetchone()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return user


def require_tutor(user: sqlite3.Row = Depends(current_user)) -> sqlite3.Row:
    if user["role"] != "tutor":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tutor role required")
    return user


def require_student(user: sqlite3.Row = Depends(current_user)) -> sqlite3.Row:
    if user["role"] != "student":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Student role required")
    return user


def ensure_own_student(db: sqlite3.Connection, tutor_id: int, student_id: int) -> None:
    linked = db.execute(
        "SELECT 1 FROM tutor_students WHERE tutor_id = ? AND student_id = ?",
        (tutor_id, student_id),
    ).fetchone()
    if linked is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found")
