"""Provider-neutral chat streaming interface. Each model vendor gets one adapter implementing ChatProvider."""

from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

from weevil_api.characters import CharacterConfig


@dataclass
class ThinkingDelta:
    text: str


@dataclass
class TextDelta:
    text: str


@dataclass
class Done:
    """The finished reply. `content` is stored and replayed verbatim on the next turn."""

    content: list[dict[str, Any]]
    text: str
    stop_reason: str | None
    usage: dict[str, Any] = field(default_factory=dict)


ErrorKind = Literal["auth", "rate_limit", "overloaded", "connection", "api"]


@dataclass
class ProviderError:
    kind: ErrorKind
    message: str


ChatEvent = ThinkingDelta | TextDelta | Done | ProviderError


class ChatProvider(Protocol):
    def stream(self, character: CharacterConfig, history: list[dict[str, Any]]) -> AsyncIterator[ChatEvent]:
        """Stream one assistant turn for `history` (provider-native message dicts)."""
        ...
