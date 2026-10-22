import json

from weevil_api.providers.base import Done, ProviderError, TextDelta, ThinkingDelta

THINKING = {"type": "thinking", "thinking": "Let me think", "signature": "sig-1"}


def sse_events(body: str) -> list[tuple[str, dict]]:
    out = []
    for chunk in body.strip().split("\n\n"):
        fields = dict(line.split(": ", 1) for line in chunk.splitlines())
        out.append((fields["event"], json.loads(fields["data"])))
    return out


async def new_conversation(client, character="clawd"):
    r = await client.post(f"/api/characters/{character}/conversations")
    assert r.status_code == 201
    return r.json()


async def test_conversation_crud(client):
    a = await new_conversation(client)
    b = await new_conversation(client)
    assert a["title"] == "New chat"

    r = await client.patch(f"/api/conversations/{a['id']}", json={"title": "  Trip ideas  "})
    assert r.json()["title"] == "Trip ideas"

    listed = (await client.get("/api/characters/clawd/conversations")).json()
    assert [c["id"] for c in listed] == [b["id"], a["id"]]  # newest activity first; renaming does not reorder

    assert (await client.delete(f"/api/conversations/{b['id']}")).status_code == 204
    assert len((await client.get("/api/characters/clawd/conversations")).json()) == 1
    assert (await client.get(f"/api/conversations/{b['id']}/messages")).status_code == 404


async def test_unknown_character_and_bad_input_are_rejected(client):
    assert (await client.get("/api/characters/nope/conversations")).status_code == 404
    assert (await client.post("/api/characters/nope/conversations")).status_code == 404
    conv = await new_conversation(client)
    assert (await client.patch(f"/api/conversations/{conv['id']}", json={"title": "   "})).status_code == 422


async def test_chat_streams_saves_both_turns_and_titles_the_conversation(client, provider):
    provider.events = [
        ThinkingDelta("Let me think"),
        TextDelta("Hello"),
        TextDelta(" there"),
        Done(
            content=[THINKING, {"type": "text", "text": "Hello there"}],
            text="Hello there",
            stop_reason="end_turn",
        ),
    ]
    conv = await new_conversation(client)
    r = await client.post(f"/api/conversations/{conv['id']}/messages", json={"text": "  Hi Claude!  "})
    assert r.headers["content-type"].startswith("text/event-stream")
    events = sse_events(r.text)

    assert [name for name, _ in events] == ["user", "thinking", "text", "text", "done"]
    assert events[2][1] == {"text": "Hello"}
    done = events[-1][1]
    assert done["title"] == "Hi Claude!"
    assert done["message"]["text"] == "Hello there"
    assert done["message"]["thinking"] == "Let me think"
    assert provider.histories[0] == [{"role": "user", "content": [{"type": "text", "text": "Hi Claude!"}]}]

    messages = (await client.get(f"/api/conversations/{conv['id']}/messages")).json()
    assert [(m["role"], m["text"]) for m in messages] == [
        ("user", "Hi Claude!"),
        ("assistant", "Hello there"),
    ]


async def test_history_replays_assistant_blocks_verbatim(client, provider):
    provider.events = [
        Done(content=[THINKING, {"type": "text", "text": "One"}], text="One", stop_reason="end_turn")
    ]
    conv = await new_conversation(client)
    await client.post(f"/api/conversations/{conv['id']}/messages", json={"text": "first"})
    await client.post(f"/api/conversations/{conv['id']}/messages", json={"text": "second"})

    assert provider.histories[1] == [
        {"role": "user", "content": [{"type": "text", "text": "first"}]},
        {"role": "assistant", "content": [THINKING, {"type": "text", "text": "One"}]},
        {"role": "user", "content": [{"type": "text", "text": "second"}]},
    ]


async def test_errors_and_refusals_save_no_assistant_turn_to_replay(client, provider):
    conv = await new_conversation(client)
    provider.events = [TextDelta("partial"), ProviderError("rate_limit", "Rate limited.")]
    events = sse_events(
        (await client.post(f"/api/conversations/{conv['id']}/messages", json={"text": "a"})).text
    )
    assert events[-1] == ("error", {"kind": "rate_limit", "message": "Rate limited."})

    provider.events = [Done(content=[], text="", stop_reason="refusal")]
    events = sse_events(
        (await client.post(f"/api/conversations/{conv['id']}/messages", json={"text": "b"})).text
    )
    assert events[-1][1]["message"]["stop_reason"] == "refusal"

    provider.events = [Done(content=[{"type": "text", "text": "ok"}], text="ok", stop_reason="end_turn")]
    await client.post(f"/api/conversations/{conv['id']}/messages", json={"text": "c"})
    # Failed and refused turns leave consecutive user turns, which the API accepts.
    assert [m["role"] for m in provider.histories[2]] == ["user", "user", "user"]
    shown = (await client.get(f"/api/conversations/{conv['id']}/messages")).json()
    assert [m["role"] for m in shown] == ["user", "user", "assistant", "user", "assistant"]


async def test_message_text_is_validated(client, provider):
    conv = await new_conversation(client)
    url = f"/api/conversations/{conv['id']}/messages"
    assert (await client.post(url, json={"text": "   "})).status_code == 422
    assert (await client.post(url, json={"text": "x" * 32_001})).status_code == 422
    missing = "/api/conversations/00000000-0000-0000-0000-000000000000/messages"
    assert (await client.post(missing, json={"text": "hi"})).status_code == 404


async def test_unexpected_provider_failures_become_an_error_event(client, provider):
    class Exploding:
        async def stream(self, character, history):
            yield TextDelta("partial")
            raise TypeError("Could not resolve authentication method.")

    from weevil_api.main import app
    from weevil_api.routes.chat import get_providers

    app.dependency_overrides[get_providers] = lambda: {"anthropic": Exploding()}
    conv = await new_conversation(client)
    body = (await client.post(f"/api/conversations/{conv['id']}/messages", json={"text": "hi"})).text
    name, data = sse_events(body)[-1]
    assert name == "error" and data["kind"] == "api"
    assert "API" in data["message"]
    roles = [m["role"] for m in (await client.get(f"/api/conversations/{conv['id']}/messages")).json()]
    assert roles == ["user"]
