# AI engineering roadmap for weevil

How to bring in the tools AI-engineer and Forward Deployed Engineer (FDE) roles ask for. Each one is tied to a real weevil feature, so you learn it by building something, not from a tutorial.

## The short version

| Order | Tool(s) | weevil feature | Main skill you learn |
|---|---|---|---|
| **M2.5** | AWS Bedrock (`boto3`) · Hugging Face Inference Providers (`huggingface_hub`) | New characters: an Amazon Nova / Bedrock character and an open-model character (Llama, Qwen…) | The provider abstraction, cloud auth (IAM), comparing models |
| **M3** | **LangGraph** · MCP Python SDK (`mcp`, `langchain-mcp-adapters`) | Agent loop per character; **equipped items become real tools/MCP servers** | Agents, tool calling, state graphs, memory, human-in-the-loop |
| **M3** | LangChain (sparingly) | Model/tool integrations inside LangGraph nodes | The ecosystem's building blocks, and when *not* to use them |
| **M3.5** | pgvector · Hugging Face `sentence-transformers` | A "knowledge" item: a character can search documents (RAG) | Embeddings, chunking, vector search, retrieval quality |
| **M4** | Langfuse (or LangSmith) · pytest evals | Trace every agent run; score answers automatically | Evals and observability, the core of FDE work |
| **M4+** | AWS CDK (Python) · ECS Fargate or App Runner · RDS · Secrets Manager | weevil online | Infrastructure as code, containers, secrets, deploying |

**Honest take:**

- **LangGraph** has the biggest impact here.
- **LangChain** is mostly integrations. Use the pieces, but don't wrap everything in it.
- **Hugging Face** gives you open models and embeddings.
- **Evals** are what get people hired as FDEs: customers care whether the agent is *right*, and you have to prove it with numbers.

---

## M2.5: More characters through new providers

**Why first:** this is the smallest step, and it uses exactly what [01](01-m2-chat-backend.md) taught. Each new vendor is a new class with a `stream(character, history)` method that yields `ThinkingDelta`/`TextDelta`/`Done`/`ProviderError`. `chat.py` doesn't change.

- **Bedrock character.**
  - Use `boto3`'s `bedrock-runtime` **Converse Stream API**, which works with Nova, Llama, Mistral and Claude on Bedrock.
  - `boto3` is synchronous, so you'll learn to run blocking calls off the event loop (`asyncio.to_thread`) or use `aioboto3`.
  - AWS credentials come from `aws login` / IAM, never from `.env` keys checked into code.
- **Hugging Face character.** `huggingface_hub.AsyncInferenceClient.chat_completion(..., stream=True)` calls open models through HF Inference Providers with one HF token. It's a good way to compare an open model with Claude side by side.
- **Changes:**
  - extend the `Provider` `Literal` in `characters.py`;
  - add a provider to `get_providers()`;
  - add pixel sprites for the new characters;
  - write a fake-client unit test for each adapter, like `test_anthropic_provider.py`.

## M3: Items become real capabilities, with LangGraph

This is the weevil vision: equip a "web search" item and the character can really search the web.

- **LangGraph** models an agent as a **graph**:
  - **nodes** do one thing each (call the model, run tools);
  - **edges** decide what happens next ("if the model asked for a tool, go to the tool node; otherwise finish");
  - the state is a typed dict that flows between nodes.
- **What it gives you for free:**
  - **Tool-calling loop:** `create_react_agent`, or your own graph.
  - **Persistent memory:** `langgraph-checkpoint-postgres` saves graph state in the Postgres you already run, so you can resume a run.
  - **Human-in-the-loop:** pause before a risky tool, e.g. "Claude wants to send an email: approve?". This would be a nice Minecraft-style confirm dialog.
  - **Streaming of tokens *and* steps:** the chat can show "🔧 using web search…".
- **Items → tools:** `items/catalog.ts` already has a `capability` field for each item. The backend maps an equipped loadout to:
  - plain Python tools for **skills**;
  - MCP servers for **MCP items**, loaded with `langchain-mcp-adapters`.
- **Keep the provider layer.** Either wrap it as a LangGraph-compatible chat model, or use `langchain-anthropic` / `langchain-aws` inside nodes. The route still streams SSE events. You'll add new ones like `tool_start` and `tool_result`.
- **Alternative:** the Claude Agent SDK is simpler if *only* Claude characters get tools. LangGraph is model-agnostic and worth more on a CV, so it's the recommendation.

## M3.5: RAG with pgvector and Hugging Face embeddings

- **pgvector** is a Postgres extension that adds a `vector` column type and similarity search, in the database you already have. Change the Docker image to `pgvector/pgvector:pg17` and add a migration that runs `CREATE EXTENSION vector`.
- **Embeddings:** `sentence-transformers` (e.g. a small BGE or MiniLM model from the HF Hub) turns text chunks into vectors locally for free. Alternatively, use Bedrock Titan or Cohere embeddings.
- **Feature:** a "knowledge" item. Drop documents onto a character, and they're chunked, embedded and stored. A `search_knowledge` tool in the LangGraph agent retrieves the top matches.
- **What you learn:** chunk sizes, hybrid search (keyword + vector), re-ranking, and the main lesson: **measure retrieval** before blaming the model.

## M4: Evals and observability

- **Tracing:**
  - **Langfuse** is open-source and can be self-hosted in Docker next to Postgres.
  - **LangSmith** is LangChain's hosted option.
  - Either one records every model call, tool call, token count, latency and cost per conversation.
- **Evals:**
  - a small dataset of prompts with expected behaviour, e.g. "with web search equipped, Claude cites a source" or "without it, Claude says it can't browse";
  - scored by code checks plus an **LLM-as-judge**;
  - run with `pytest` in CI, so a prompt or model change that makes answers worse fails the build.
- **Why it matters for FDE:** deploying AI for a customer is mostly about proving it works, on *their* data, and keeps working.

## M4+: Deploy to AWS

- **AWS CDK in Python:** your infrastructure as Python classes. You run `cdk deploy`, and CDK generates CloudFormation.
- **Shape:**
  - the FastAPI container on **App Runner** (simplest) or **ECS Fargate** (more control);
  - **RDS Postgres** (with pgvector);
  - **Secrets Manager** for API keys;
  - the web build on S3 + CloudFront.
- **Also learn:** a `Dockerfile` for the API, GitHub Actions CI (tests, lint, deploy), and the API-key policy decision from M2 (who pays for tokens on a public demo: rate limits, or letting visitors bring their own key).

---

## Also worth knowing (no weevil feature yet)

- **Structured outputs / Pydantic AI:** get typed JSON out of models (Pydantic already validates your API).
- **vLLM / TGI / Ollama:** serving open models yourself. Useful if a customer can't send data to an API.
- **Fine-tuning** (HF `transformers` + `peft`/LoRA, or SageMaker/Bedrock customization): rarely the first answer. Try prompting, RAG and evals first.
- **Prompt caching and cost control:** already in use in `providers/anthropic.py` (`cache_control`). Read your token `usage` and know what each conversation costs.

Each milestone gets its own learning doc (`02-…`, `03-…`) when it's built.
