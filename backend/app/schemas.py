"""Схемы запросов и ответов API."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

Role = Literal["tutor", "student"]
HomeworkStatus = Literal["assigned", "submitted", "returned", "checked"]


def _not_blank(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("must not be blank")
    return value


class RegisterIn(BaseModel):
    email: EmailStr
    name: str = Field(max_length=100)
    password: str = Field(min_length=8, max_length=128)
    role: Role

    _name = field_validator("name")(_not_blank)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: Role


class LoginOut(BaseModel):
    token: str
    user: UserOut


class AddStudentIn(BaseModel):
    email: EmailStr


class HomeworkIn(BaseModel):
    student_id: int
    title: str = Field(max_length=200)
    description: str = Field(default="", max_length=5000)
    due_date: date

    _title = field_validator("title")(_not_blank)


class SubmitIn(BaseModel):
    answer: str = Field(max_length=20000)

    _answer = field_validator("answer")(_not_blank)


class ReviewIn(BaseModel):
    grade: int = Field(ge=1, le=5)
    feedback: str = Field(default="", max_length=5000)


class ReturnIn(BaseModel):
    feedback: str = Field(max_length=5000)

    _feedback = field_validator("feedback")(_not_blank)


class HomeworkOut(BaseModel):
    id: int
    tutor_id: int
    student_id: int
    student_name: str
    title: str
    description: str
    due_date: date
    status: HomeworkStatus
    answer: str | None
    submitted_at: str | None
    grade: int | None
    feedback: str | None
    checked_at: str | None
    created_at: str


class LessonIn(BaseModel):
    student_id: int
    starts_at: datetime
    duration_min: int = Field(ge=15, le=240)
    topic: str = Field(max_length=200)

    _topic = field_validator("topic")(_not_blank)


class LessonOut(BaseModel):
    id: int
    tutor_id: int
    student_id: int
    student_name: str
    starts_at: datetime
    duration_min: int
    topic: str


class ProgressOut(BaseModel):
    student_id: int
    student_name: str
    total: int
    assigned: int
    submitted: int
    returned: int
    checked: int
    overdue: int
    average_grade: float | None
