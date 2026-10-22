"""Server-side character registry: the source of truth for which provider and model each character uses.

The browser only ever sends a character id; models and providers are never taken from the client.
"""

from dataclasses import dataclass
from typing import Literal

Provider = Literal["anthropic"]  # "bedrock" and "openai" join with their characters.
Effort = Literal["low", "medium", "high", "xhigh", "max"]


@dataclass(frozen=True)
class CharacterConfig:
    id: str
    name: str
    provider: Provider
    model: str
    system: str
    effort: Effort = "medium"
    # Retry safety-classifier refusals on a fallback model inside the same request.
    fallbacks: bool = True


CHARACTERS: dict[str, CharacterConfig] = {
    "clawd": CharacterConfig(
        id="clawd",
        name="Claude",
        provider="anthropic",
        model="claude-opus-5-5",
        system=(
            "You are Claude, made by Anthropic. You're chatting inside weevil, a small pixel-art world where "
            "AI models wander around as characters; the user picked you from the character-select screen. "
            "Be helpful, warm and direct, and use Markdown when it makes an answer easier to read."
        ),
    ),
}
