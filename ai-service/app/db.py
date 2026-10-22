"""PostgreSQL access (psycopg3 async pool). Every query is scoped to a user id."""

import json
from collections.abc import Sequence
from typing import Any

from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from . import config

pool: AsyncConnectionPool | None = None


async def open_pool() -> None:
    global pool
    if pool is not None:
        return
    if not config.DB_URL:
        return
    pool = AsyncConnectionPool(
        conninfo=config.DB_URL,
        min_size=1,
        max_size=8,
        open=False,
        kwargs={"row_factory": dict_row, "prepare_threshold": None, "autocommit": False},
    )
    await pool.open(wait=True, timeout=15)


async def close_pool() -> None:
    global pool
    if pool is not None:
        await pool.close()
        pool = None


def _ready() -> AsyncConnectionPool:
    if pool is None:
        raise RuntimeError("Database is not configured")
    return pool


async def fetch(sql: str, params: Sequence[Any] = ()) -> list[dict[str, Any]]:
    async with _ready().connection() as conn:
        cur = await conn.execute(sql, params)
        return list(await cur.fetchall())


async def fetch_one(sql: str, params: Sequence[Any] = ()) -> dict[str, Any] | None:
    rows = await fetch(sql, params)
    return rows[0] if rows else None


async def execute(sql: str, params: Sequence[Any] = ()) -> int:
    async with _ready().connection() as conn:
        cur = await conn.execute(sql, params)
        return cur.rowcount


async def execute_many(sql: str, rows: Sequence[Sequence[Any]]) -> int:
    async with _ready().connection() as conn:
        async with conn.cursor() as cur:
            await cur.executemany(sql, list(rows))
    return len(rows)


def as_json(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, default=str)
