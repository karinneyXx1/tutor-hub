"""Точка входа приложения."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import connect, init_db
from .routers import auth, homework, lessons, students


@asynccontextmanager
async def lifespan(_: FastAPI):
    conn = connect()
    init_db(conn)
    conn.close()
    yield


app = FastAPI(title="Код-репетитор API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("TUTOR_HUB_CORS", "http://localhost:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(homework.router)
app.include_router(lessons.router)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
