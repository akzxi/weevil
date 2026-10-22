import uuid
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, StringConstraints
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from weevil_api.characters import CHARACTERS
from weevil_api.db import get_session
from weevil_api.models import Conversation, Message, utcnow

router = APIRouter(prefix="/api")
Session = Annotated[AsyncSession, Depends(get_session)]


class ConversationOut(BaseModel):
    id: uuid.UUID
    character_id: str
    title: str
    updated_at: datetime


class MessageOut(BaseModel):
    id: int
    role: str
    text: str
    thinking: str
    stop_reason: str | None
    created_at: datetime


class Rename(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


def message_out(m: Message) -> MessageOut:
    thinking = "\n\n".join(b.get("thinking", "") for b in m.content if b.get("type") == "thinking")
    return MessageOut(
        id=m.id,
        role=m.role,
        text=m.text,
        thinking=thinking.strip(),
        stop_reason=m.stop_reason,
        created_at=m.created_at,
    )


def require_character(character_id: str) -> None:
    if character_id not in CHARACTERS:
        raise HTTPException(404, "Unknown character")


async def get_conversation(session: AsyncSession, conversation_id: uuid.UUID) -> Conversation:
    conversation = await session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(404, "Conversation not found")
    return conversation


async def conversation_messages(session: AsyncSession, conversation_id: uuid.UUID) -> list[Message]:
    rows = await session.scalars(
        select(Message).where(Message.conversation_id == conversation_id).order_by(Message.id)
    )
    return list(rows)


@router.get("/characters/{character_id}/conversations")
async def list_conversations(character_id: str, session: Session) -> list[ConversationOut]:
    require_character(character_id)
    rows = await session.scalars(
        select(Conversation)
        .where(Conversation.character_id == character_id)
        .order_by(Conversation.updated_at.desc())
    )
    return [ConversationOut.model_validate(c, from_attributes=True) for c in rows]


@router.post("/characters/{character_id}/conversations", status_code=201)
async def create_conversation(character_id: str, session: Session) -> ConversationOut:
    require_character(character_id)
    conversation = Conversation(character_id=character_id, updated_at=utcnow())
    session.add(conversation)
    await session.commit()
    return ConversationOut.model_validate(conversation, from_attributes=True)


@router.patch("/conversations/{conversation_id}")
async def rename_conversation(conversation_id: uuid.UUID, body: Rename, session: Session) -> ConversationOut:
    conversation = await get_conversation(session, conversation_id)
    conversation.title = body.title
    await session.commit()
    return ConversationOut.model_validate(conversation, from_attributes=True)


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: uuid.UUID, session: Session) -> Response:
    await session.delete(await get_conversation(session, conversation_id))
    await session.commit()
    return Response(status_code=204)


@router.get("/conversations/{conversation_id}/messages")
async def list_messages(conversation_id: uuid.UUID, session: Session) -> list[dict[str, Any]]:
    await get_conversation(session, conversation_id)
    return [
        message_out(m).model_dump(mode="json") for m in await conversation_messages(session, conversation_id)
    ]
