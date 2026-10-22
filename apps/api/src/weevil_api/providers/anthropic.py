"""Claude via the Anthropic SDK (streaming Messages API)."""

from collections.abc import AsyncIterator
from typing import Any

import anthropic

from weevil_api.characters import CharacterConfig
from weevil_api.providers.base import ChatEvent, Done, ProviderError, TextDelta, ThinkingDelta

MAX_TOKENS = 64_000
FALLBACK_BETA = "server-side-fallback-2026-07-01"
# Model-internal blocks a fallback model can't continue from.
_INTERNAL = {"thinking", "redacted_thinking", "tool_use", "server_tool_use"}


def replayable(content: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Blocks to send back for an earlier assistant turn.

    After a mid-stream fallback, model-internal blocks before the last `fallback` marker must be omitted;
    everything else is echoed back unchanged (thinking signatures included).
    """
    last = max((i for i, b in enumerate(content) if b.get("type") == "fallback"), default=-1)
    return [b for i, b in enumerate(content) if i > last or b.get("type") not in _INTERNAL]


class AnthropicProvider:
    def __init__(self, client: anthropic.AsyncAnthropic):
        self.client = client

    async def stream(
        self, character: CharacterConfig, history: list[dict[str, Any]]
    ) -> AsyncIterator[ChatEvent]:
        params: dict[str, Any] = {
            "model": character.model,
            "max_tokens": MAX_TOKENS,
            "system": character.system,
            "messages": history,
            "thinking": {"type": "adaptive", "display": "summarized"},
            "output_config": {"effort": character.effort},
            "cache_control": {"type": "ephemeral"},
        }
        if character.fallbacks:
            params |= {"betas": [FALLBACK_BETA], "fallbacks": "default"}

        try:
            async with self.client.beta.messages.stream(**params) as stream:
                async for event in stream:
                    if event.type != "content_block_delta":
                        continue
                    if event.delta.type == "thinking_delta":
                        yield ThinkingDelta(event.delta.thinking)
                    elif event.delta.type == "text_delta":
                        yield TextDelta(event.delta.text)
                final = await stream.get_final_message()
        except anthropic.AuthenticationError, anthropic.PermissionDeniedError:
            yield ProviderError("auth", "The API key was rejected. Check ANTHROPIC_API_KEY in apps/api/.env.")
            return
        except anthropic.RateLimitError:
            yield ProviderError("rate_limit", "Rate limited by the Claude API. Wait a moment and try again.")
            return
        except anthropic.APIStatusError as e:
            if e.status_code == 529:
                yield ProviderError("overloaded", "Claude is overloaded right now. Try again shortly.")
            else:
                yield ProviderError("api", f"The Claude API returned an error ({e.status_code}).")
            return
        except anthropic.APIConnectionError:
            yield ProviderError(
                "connection", "Couldn't reach the Claude API. Check your connection and retry."
            )
            return

        if final.stop_reason == "refusal":
            # The whole fallback chain declined; partial output is not an answer.
            yield Done(content=[], text="", stop_reason="refusal")
            return
        content = [b.model_dump(mode="json", exclude_none=True) for b in final.content]
        text = "".join(b["text"] for b in content if b.get("type") == "text")
        usage = {"input_tokens": final.usage.input_tokens, "output_tokens": final.usage.output_tokens}
        yield Done(content=content, text=text, stop_reason=final.stop_reason, usage=usage)
