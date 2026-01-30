# AI & LLM Integration

## Current State
- **OpenAI**: `backend/agno_system_optimized.py` initializes `openai.OpenAI` with `OPENAI_API_KEY` and powers chat, document generation, and analysis endpoints.
- **Google Gemini**: Integrated through `google-genai` when `GEMINI_API_KEY` or `GOOGLE_API_KEY` is available; primarily used for contract processing.
- **Agno System**: `OptimizedAgnoSystem` orchestrates specialized agents (`pdf_processor_agent`, `maintenance_planner_agent`, `report_generator_agent`, etc.).
- **Supabase Edge Functions**: Multiple Deno functions (`generate-maintenance-plan`, `process-contracts`, `smart-chat`) call OpenAI directly—some reference the non-existent model `gpt-5-mini-2025-08-07`.
- **LangChain/LangGraph**: Packages are installed but only lightly adopted; current flows rely on handcrafted prompts and caching.
- **Fallbacks**: `DocumentGeneratorFactory` selects the appropriate agent; `PDFExtractor` chains multiple extraction libraries before involving LLMs.

## Missing: OpenRouter
OpenRouter is defined as the target gateway for AI providers, yet:
- No code references the OpenRouter API or SDK.
- Environment files lack `OPENROUTER_API_KEY` or related variables.
- Both backend and edge functions talk directly to OpenAI/Gemini.

## Integration Plan
1. **Configuration** – Add `OPENROUTER_API_KEY` and default model settings to `config.py` and Supabase environment variables.
2. **Unified Client** – Implement a wrapper (e.g., `backend/services/llm_client.py`) that routes requests to OpenRouter and supports provider fallbacks (OpenAI, Anthropic, etc.).
3. **Refactor Agno** – Inject the new client into `OptimizedAgnoSystem` to remove direct OpenAI ties.
4. **Edge Functions** – Replace `https://api.openai.com` calls with `https://openrouter.ai/api/v1` and supply the required headers (`Authorization`, `HTTP-Referer`, `X-Title`).
5. **Model Mapping** – Define supported defaults (e.g., `gpt-4o-mini`) and update prompts accordingly.
6. **Observability** – Log latency, token usage, and provider metadata (consider a dedicated `ai_logs` table).
7. **Documentation** – Coordinate work with the improvement prompt in `prompts/openrouter-integration.md`.

## Active Use Cases
- **Contract Extraction**: Prompts in `backend/prompts/contract_extraction.yaml` and Supabase `extract-contract-data` function.
- **Report Generation**: `/api/generate-ai-reports` and `DocumentGeneratorFactory` build technical outputs.
- **Chat**: `/api/chat` and the `smart-chat` edge function deliver contextual assistance.
- **Maintenance Plans**: `maintenance_planner_agent` and Supabase `generate-maintenance-plan`.
- **Scheduling**: `schedule_generator_agent` and `generate-technical-schedules`.

## Prompt Management
- `backend/utils/prompt_loader.py` loads YAML prompts from `backend/prompts/`.
- Edge Functions contain inline prompts; centralizing them would simplify updates and reuse.

## Risks & Gaps
- The model `gpt-5-mini-2025-08-07` does not exist—replace it immediately to avoid runtime failures.
- Edge functions depend on environment variables for `OPENAI_API_KEY`; verify they are not hardcoded.
- Lack of caching can lead to high OpenAI costs; consider response caching or throttling.
- Logging is fragmented; introduce consistent tracking for latency, provider choice, and tokens per call.

## Roadmap
- Build an `AIClient` that supports OpenRouter with fallbacks to OpenAI/Gemini.
- Extend timeout/retry settings (see `Config.TIMEOUT_CONFIG`) specifically for AI providers.
- Add automated tests/mocks for AI interactions to avoid hitting real endpoints in CI.
- Document prompt hygiene, input sanitization, and output validation guidelines.
