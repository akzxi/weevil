from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from weevil_api.config import settings
from weevil_api.routes import chat, conversations

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
