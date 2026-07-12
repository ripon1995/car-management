from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# statement_cache_size=0: required for Supabase's pgbouncer pooler in transaction
# mode, which doesn't support asyncpg's server-side prepared statement cache
# (otherwise: asyncpg.exceptions.DuplicatePreparedStatementError).
engine = create_async_engine(
    settings.database_url, pool_pre_ping=True, connect_args={"statement_cache_size": 0}
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
