import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.memory_item import MemorySourceType
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services import memory_service

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskRead])
async def list_tasks(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = await db.scalars(
        select(Task).where(Task.user_id == user.id).order_by(Task.status, Task.due_date.nulls_last())
    )
    return rows.all()


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    task = Task(user_id=user.id, **payload.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    await memory_service.add_memory(
        db, user.id, MemorySourceType.task, f"{task.title}: {task.description}", source_id=task.id
    )
    return task


async def _get_owned_task(db: AsyncSession, user: User, task_id: uuid.UUID) -> Task:
    task = await db.get(Task, task_id)
    if not task or task.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    return await _get_owned_task(db, user, task_id)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = await _get_owned_task(db, user, task_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    await memory_service.add_memory(
        db, user.id, MemorySourceType.task, f"{task.title}: {task.description}", source_id=task.id
    )
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    task = await _get_owned_task(db, user, task_id)
    await db.delete(task)
    await db.commit()
