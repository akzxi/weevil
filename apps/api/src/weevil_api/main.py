import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from weevil_api.config import settings
from weevil_api.routes import chat, conversations

if settings.anthropic_api_key is None and "ANTHROPIC_API_KEY" not in os.environ:
    logging.getLogger("weevil_api").warning(
        "No ANTHROPIC_API_KEY configured: copy apps/api/.env.example to apps/api/.env and add your key."
    )

app = FastAPI(title="weevil API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)
app.include_router(conversations.router)
app.include_router(chat.router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
