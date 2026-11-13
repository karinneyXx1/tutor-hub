"""Регистрация, вход, выход и текущий пользователь."""

import sqlite3

from fastapi import APIRouter, Depends, Header, HTTPException, status

from ..db import get_db
from ..deps import current_user
from ..schemas import LoginIn, LoginOut, RegisterIn, UserOut
from ..security import hash_password, new_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def to_user(row: sqlite3.Row) -> UserOut:
    return UserOut(id=row["id"], email=row["email"], name=row["name"], role=row["role"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, db: sqlite3.Connection = Depends(get_db)) -> UserOut:
    email = data.email.lower()
    if db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    cur = db.execute(
        "INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)",
        (email, data.name, hash_password(data.password), data.role),
    )
    db.commit()
    row = db.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    return to_user(row)


@router.post("/login", response_model=LoginOut)
def login(data: LoginIn, db: sqlite3.Connection = Depends(get_db)) -> LoginOut:
    row = db.execute("SELECT * FROM users WHERE email = ?", (data.email.lower(),)).fetchone()
    if row is None or not verify_password(data.password, row["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password")
    token = new_token()
    db.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, row["id"]))
    db.commit()
    return LoginOut(token=token, user=to_user(row))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    authorization: str = Header(),
    _: sqlite3.Row = Depends(current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> None:
    db.execute("DELETE FROM sessions WHERE token = ?", (authorization.removeprefix("Bearer "),))
    db.commit()


@router.get("/me", response_model=UserOut)
def me(user: sqlite3.Row = Depends(current_user)) -> UserOut:
    return to_user(user)
