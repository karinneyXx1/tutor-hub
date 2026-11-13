"""Подключение к SQLite и схема базы данных."""

import os
import sqlite3
from collections.abc import Iterator

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    name          TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK (role IN ('tutor', 'student')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tutor_students (
    tutor_id   INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (tutor_id, student_id)
);

CREATE TABLE IF NOT EXISTS homework (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    tutor_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    student_id   INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title        TEXT    NOT NULL,
    description  TEXT    NOT NULL DEFAULT '',
    due_date     TEXT    NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'assigned'
                 CHECK (status IN ('assigned', 'submitted', 'returned', 'checked')),
    answer       TEXT,
    submitted_at TEXT,
    grade        INTEGER CHECK (grade BETWEEN 1 AND 5),
    feedback     TEXT,
    checked_at   TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lessons (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    tutor_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    student_id   INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    starts_at    TEXT    NOT NULL,
    duration_min INTEGER NOT NULL,
    topic        TEXT    NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
"""


def database_path() -> str:
    return os.environ.get("TUTOR_HUB_DB", "tutor_hub.sqlite3")


def connect(path: str | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(path or database_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def get_db() -> Iterator[sqlite3.Connection]:
    """Зависимость FastAPI: одно соединение на запрос."""
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()
