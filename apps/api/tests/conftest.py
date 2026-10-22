import os

# Point the app at the test database before anything imports weevil_api.config.
os.environ["DATABASE_URL"] = "postgresql+asyncpg://weevil:weevil@localhost:5432/weevil_test"

import httpx  # noqa: E402
import pytest  # noqa: E402
from sqlalchemy import text  # noqa: E402

from weevil_api import models  # noqa: E402,F401
from weevil_api.db import Base, engine  # noqa: E402
from weevil_api.main import app  # noqa: E402
from weevil_api.routes.chat import get_providers  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
async def schema():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


@pytest.fixture(autouse=True)
async def clean_tables():
    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE conversations, messages RESTART IDENTITY CASCADE"))


class FakeProvider:
    """Replays scripted events and records the history it was given."""

    def __init__(self, events):
        self.events = events
        self.histories = []

    async def stream(self, character, history):
        self.histories.append(history)
        for event in self.events:
            yield event


@pytest.fixture
def provider():
    fake = FakeProvider([])
    app.dependency_overrides[get_providers] = lambda: {"anthropic": fake}
    yield fake
    app.dependency_overrides.clear()


@pytest.fixture
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        yield c
