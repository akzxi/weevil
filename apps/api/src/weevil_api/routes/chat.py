import json
import uuid
from collections.abc import AsyncIterator
from functools import cache
from typing import Annotated, Any

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from fastapi.sse import EventSourceResponse
from pydantic import BaseModel, StringConstraints

from weevil_api.characters import CHARACTERS
from weevil_api.config import settings
from weevil_api.db import SessionLocal
from weevil_api.models import DEFAULT_TITLE, Message, utcnow
from weevil_api.providers.anthropic import AnthropicProvider, replayable
from weevil_api.providers.base import ChatProvider, Done, ProviderError, TextDelta, ThinkingDelta
from weevil_api.routes.conversations import Session, conversation_messages, get_conversation, message_out

router = APIRouter(prefix="/api")

MAX_MESSAGE_CHARS = 32_000
TITLE_CHARS = 60


@cache
def get_providers() -> dict[str, ChatProvider]:
    key = settings.anthropic_api_key.get_secret_value() if settings.anthropic_api_key else None
    return {"anthropic": AnthropicProvider(anthropic.AsyncAnthropic(api_key=key))}


Providers = Annotated[dict[str, ChatProvider], Depends(get_providers)]


class SendMessage(BaseModel):
    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_MESSAGE_CHARS)]


def sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def history_of(messages: list[Message]) -> list[dict[str, Any]]:
    # Refused or failed assistant turns are stored empty for display but never replayed.
    return [
        {"role": m.role, "content": replayable(m.content) if m.role == "assistant" else m.content}
        for m in messages
        if m.content
    ]


def title_from(text: str) -> str:
    line = " ".join(text.split())
    return line if len(line) <= TITLE_CHARS else line[: TITLE_CHARS - 1].rstrip() + "…"


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: uuid.UUID, body: SendMessage, session: Session, providers: Providers
) -> EventSourceResponse:
    conversation = await get_conversation(session, conversation_id)
    character = CHARACTERS.get(conversation.character_id)
    if character is None:
        raise HTTPException(404, "Unknown character")
    provider = providers[character.provider]

    previous = await conversation_messages(session, conversation_id)
    user = Message(
        conversation_id=conversation_id,
        role="user",
        content=[{"type": "text", "text": body.text}],
        text=body.text,
    )
    session.add(user)
    if not previous and conversation.title == DEFAULT_TITLE:
        conversation.title = title_from(body.text)
    conversation.updated_at = utcnow()
    await session.commit()
    history = history_of([*previous, user])
    title = conversation.title
    user_out = message_out(user).model_dump(mode="json")

    async def events() -> AsyncIterator[str]:
        yield sse("user", {"message": user_out})
        # If the client disconnects, this generator is cancelled before Done: no partial reply is saved.
        async for event in provider.stream(character, history):
            match event:
                case ThinkingDelta(text=text):
                    yield sse("thinking", {"text": text})
                case TextDelta(text=text):
                    yield sse("text", {"text": text})
                case ProviderError(kind=kind, message=message):
                    yield sse("error", {"kind": kind, "message": message})
                    return
                case Done():
                    yield sse("done", {"message": await save_reply(conversation_id, event), "title": title})

    return EventSourceResponse(events())


async def save_reply(conversation_id: uuid.UUID, done: Done) -> dict[str, Any]:
    # A fresh session: the request-scoped one may already be closed while the response streams.
    async with SessionLocal() as session:
        reply = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=done.content,
            text=done.text,
            stop_reason=done.stop_reason,
        )
        session.add(reply)
        conversation = await get_conversation(session, conversation_id)
        conversation.updated_at = utcnow()
        await session.commit()
        return message_out(reply).model_dump(mode="json")
