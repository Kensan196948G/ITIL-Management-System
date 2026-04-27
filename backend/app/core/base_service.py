from typing import TypeVar, Generic, Type, Optional, Sequence
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseService(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(self, db: AsyncSession, id: UUID) -> Optional[ModelType]:
        result = await db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_multi(
        self, db: AsyncSession, *, page: int = 1, page_size: int = 20
    ) -> tuple[Sequence[ModelType], int]:
        offset = (page - 1) * page_size
        count_result = await db.execute(select(func.count()).select_from(self.model))
        total = count_result.scalar_one()
        result = await db.execute(select(self.model).offset(offset).limit(page_size))
        return result.scalars().all(), total

    async def create(self, db: AsyncSession, **kwargs) -> ModelType:
        obj = self.model(**kwargs)
        db.add(obj)
        await db.flush()
        await db.refresh(obj)
        return obj

    async def update(self, db: AsyncSession, obj: ModelType, **kwargs) -> ModelType:
        for key, value in kwargs.items():
            if value is not None:
                setattr(obj, key, value)
        await db.flush()
        await db.refresh(obj)
        return obj

    async def delete(self, db: AsyncSession, id: UUID) -> bool:
        obj = await self.get(db, id)
        if not obj:
            return False
        await db.delete(obj)
        return True
