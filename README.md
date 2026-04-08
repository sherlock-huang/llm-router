# llm-router

An open-source multi-model routing service for developer workflows.

`llm-router` sits in front of multiple LLM providers, analyzes the incoming task, and routes the request to a more suitable model. It also exposes an OpenAI-compatible chat endpoint, optional task decomposition, and a lightweight local web console for manual testing.

## What It Is Good For

- Routing coding, analysis, summary, and general prompts to different model backends
- Giving internal tools a single API entry instead of hard-coding one provider everywhere
- Testing task-based routing logic before building a larger agent platform
- Comparing rule-based routing with LLM-assisted routing for the same prompt flow

## Current Stack

- Runtime: Node.js + TypeScript + Express
- Config: `.env` + YAML model config
- Current provider wiring:
  - StepFun
  - Volcengine Ark
  - MiniMax

## Main Capabilities

- Task classification and model routing
- Optional LLM-driven analysis path
- Optional task decomposition for more complex prompts
- OpenAI-style `/v1/chat/completions` endpoint
- `/v1/models`, `/v1/route`, and `/health` endpoints
- Local web dashboard for quick manual testing

## Project Status

This project is a practical developer tool, not a finished cloud platform.

What already exists:

- Runnable local API service
- Provider registry and gateway layer
- Rule-based router
- Task analyzer and decomposition flow
- Local test page

What is still evolving:

- Better routing heuristics
- Stronger provider abstraction
- More complete tests
- Production deployment hardening

## Quick Start

### Requirements

- Node.js 18+
- npm or pnpm

### Install

```bash
git clone https://github.com/sherlock-huang/llm-router.git
cd llm-router
npm install
```

### Configure Environment Variables

```bash
cp .env.example .env
```

Fill in the providers you actually plan to use:

```env
STEP_API_KEY=your_stepfun_api_key_here
ARK_API_KEY=your_ark_api_key_here
MINIMAX_API_KEY=your_minimax_api_key_here
PORT=3044
ENABLE_DEBUG_ENV=false
```

### Start the Server

```bash
npm run dev
```

Then open:

- App: `http://localhost:3044`
- Health: `http://localhost:3044/health`
- Models: `http://localhost:3044/v1/models`

## Example API Calls

### Auto-Routed Chat

```bash
curl -X POST http://localhost:3044/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [
      { "role": "user", "content": "Write a Python quicksort function" }
    ]
  }'
```

### List Available Models

```bash
curl http://localhost:3044/v1/models
```

### Inspect Routing Result

```bash
curl -X POST http://localhost:3044/v1/route \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Explain dependency injection and compare it with service locator"
  }'
```

## How Routing Works

Current routing happens in layers:

1. Parse the incoming prompt
2. Classify task type
3. Pick a primary model
4. Optionally decompose complex tasks
5. Execute and return a unified response

There are two routing modes:

- Rule-based routing
- LLM-assisted routing

The rule-based path is the current baseline and the easiest one to audit.

## Project Structure

```text
llm-router/
├─ public/
│  └─ index.html
├─ src/
│  ├─ api/
│  │  └─ server.ts
│  ├─ config/
│  │  ├─ loader.ts
│  │  └─ models.yaml
│  ├─ models/
│  │  └─ liteLLM_gateway.ts
│  ├─ router/
│  │  └─ rule_based_router.ts
│  ├─ synthesizer/
│  ├─ tasks/
│  └─ types/
├─ tests/
├─ .env.example
└─ README.md
```

## Security Notes

- No real API keys should ever be committed into this repository.
- `.env` is intentionally ignored by Git.
- `.env.example` must only contain placeholders.
- `/debug/env` is intended for local debugging and should stay disabled in production unless explicitly enabled.
- Provider status visibility is not the same as secret exposure, but it still reveals infrastructure choices, so treat it carefully.

## Suggested Next Improvements

- Add provider-level integration tests with mocked responses
- Move routing rules into config instead of hard-coding all logic
- Add stronger logging and request tracing
- Add deployment instructions for a small VPS or container runtime
- Add rate limiting and auth if you plan to expose the API publicly

## License

MIT

## Contributions And Feedback

This repository is open for sharing and reference.

- Found an issue? Open an [Issue](https://github.com/sherlock-huang/llm-router/issues)
- Have an improvement idea? Open a [Pull Request](https://github.com/sherlock-huang/llm-router/pulls)

## Related Links

- Main site: https://kunpeng-ai.com
- GitHub org: https://github.com/kunpeng-ai-research
- OpenClaw official site: https://openclaw.ai
