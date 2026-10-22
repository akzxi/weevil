from types import SimpleNamespace as NS

import anthropic
import httpx2

from weevil_api.characters import CHARACTERS
from weevil_api.providers.anthropic import AnthropicProvider, replayable
from weevil_api.providers.base import Done, ProviderError, TextDelta, ThinkingDelta

CLAWD = CHARACTERS["clawd"]


class Block(dict):
    """Stands in for an SDK content block: attribute access plus model_dump()."""

    __getattr__ = dict.__getitem__

    def model_dump(self, **_):
        return dict(self)


def delta(kind: str, value: str):
    field = "thinking" if kind == "thinking_delta" else "text"
    return NS(type="content_block_delta", delta=NS(type=kind, **{field: value}))


class FakeStream:
    def __init__(self, events, final):
        self.events, self.final = events, final

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    def __aiter__(self):
        async def gen():
            for e in self.events:
                yield e

        return gen()

    async def get_final_message(self):
        return self.final


class FakeClient:
    def __init__(self, stream=None, error=None):
        self.calls = []
        self._stream, self._error = stream, error
        self.beta = NS(messages=NS(stream=self._open))

    def _open(self, **kwargs):
        self.calls.append(kwargs)
        if self._error:
            raise self._error
        return self._stream


def final_message(blocks, stop_reason="end_turn"):
    return NS(
        content=[Block(b) for b in blocks],
        stop_reason=stop_reason,
        usage=NS(input_tokens=10, output_tokens=5),
    )


async def collect(provider, history):
    return [e async for e in provider.stream(CLAWD, history)]


async def test_streams_thinking_and_text_then_done_with_exact_blocks():
    blocks = [{"type": "thinking", "thinking": "hmm", "signature": "sig"}, {"type": "text", "text": "Hi!"}]
    client = FakeClient(
        FakeStream(
            [
                NS(type="message_start"),
                delta("thinking_delta", "hmm"),
                delta("text_delta", "Hi"),
                delta("text_delta", "!"),
            ],
            final_message(blocks),
        )
    )
    events = await collect(AnthropicProvider(client), [{"role": "user", "content": "hello"}])

    assert events[:3] == [ThinkingDelta("hmm"), TextDelta("Hi"), TextDelta("!")]
    done = events[-1]
    assert isinstance(done, Done)
    assert done.content == blocks  # signature kept so thinking replays unchanged
    assert done.text == "Hi!"
    assert done.stop_reason == "end_turn"


async def test_request_uses_character_config_adaptive_thinking_fallbacks_and_caching():
    client = FakeClient(FakeStream([], final_message([{"type": "text", "text": "ok"}])))
    history = [{"role": "user", "content": "hello"}]
    await collect(AnthropicProvider(client), history)

    call = client.calls[0]
    assert call["model"] == "claude-opus-5-5"
    assert call["thinking"] == {"type": "adaptive", "display": "summarized"}
    assert call["output_config"] == {"effort": CLAWD.effort}
    assert call["fallbacks"] == "default"
    assert call["betas"] == ["server-side-fallback-2026-07-01"]
    assert call["cache_control"] == {"type": "ephemeral"}
    assert call["system"] == CLAWD.system
    assert call["messages"] == history


async def test_refusal_discards_partial_output():
    client = FakeClient(
        FakeStream(
            [delta("text_delta", "Sure, here")],
            final_message([{"type": "text", "text": "Sure, here"}], stop_reason="refusal"),
        )
    )
    done = (await collect(AnthropicProvider(client), [{"role": "user", "content": "x"}]))[-1]
    assert done.stop_reason == "refusal"
    assert done.content == [] and done.text == ""


def api_error(cls, status):
    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    return cls("boom", response=httpx2.Response(status, request=request), body=None)


async def test_sdk_errors_become_friendly_provider_errors():
    cases = [
        (api_error(anthropic.AuthenticationError, 401), "auth"),
        (api_error(anthropic.RateLimitError, 429), "rate_limit"),
        (api_error(anthropic.InternalServerError, 529), "overloaded"),
        (api_error(anthropic.BadRequestError, 400), "api"),
        (anthropic.APIConnectionError(request=httpx2.Request("POST", "https://x")), "connection"),
    ]
    for error, kind in cases:
        events = await collect(AnthropicProvider(FakeClient(error=error)), [{"role": "user", "content": "x"}])
        assert len(events) == 1 and isinstance(events[0], ProviderError), kind
        assert events[0].kind == kind


def test_replayable_drops_model_internal_blocks_before_the_last_fallback():
    content = [
        {"type": "thinking", "thinking": "a", "signature": "s1"},
        {"type": "text", "text": "partial "},
        {"type": "fallback", "from": {"model": "x"}, "to": {"model": "y"}},
        {"type": "thinking", "thinking": "b", "signature": "s2"},
        {"type": "text", "text": "rest"},
    ]
    assert replayable(content) == content[1:]
    no_fallback = [{"type": "thinking", "thinking": "a", "signature": "s"}, {"type": "text", "text": "t"}]
    assert replayable(no_fallback) == no_fallback
