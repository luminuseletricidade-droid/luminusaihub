# Project Overview

## Context
Luminus AI Hub centralizes the contract and maintenance operations of power-generation services. The repository combines a Vite + React frontend, a FastAPI backend with Agno AI orchestration, supabase edge functions, and automation scripts. The current codebase reflects a transition from a fully Supabase-driven stack to a hybrid approach where the backend communicates directly with PostgreSQL.

## Purpose
- Digitize contract lifecycles, including onboarding, monitoring, and renewals.
- Manage maintenance plans, schedules, and alerts with real-time dashboards.
- Provide AI-powered tooling for PDF extraction, technical report generation, and conversational assistance.
- Automate recurring reports and operational calendars.

## Feature Summary

### Implemented
- Rich dashboard and vertical pages (`src/pages/*`) for contracts, maintenance, clients, uploads, and admin workflows.
- PDF ingestion pipeline with multi-library fallback (`backend/utils/pdf_extractor.py`) and Supabase edge assistance (`supabase/functions/extract-contract-data`).
- Agno agents to generate reports, maintenance plans, and chat responses (`backend/agno_agents`, `backend/main.py`).
- Real-time synchronization through Supabase channels via hooks such as `useRealtimeSync` and `useOptimizedRealtimeSync`.
- Custom FastAPI endpoints for CRUD, AI workflows, and admin metrics with JWT authentication.
- Extensive Supabase SQL migrations covering contracts, documents, AI metadata, and reporting.
- Operational scripts for migrations, testing, and maintenance tasks (`backend/scripts`).

### In Progress / Upcoming
- Harden the custom JWT authentication (secret rotation, refresh tokens, secure storage).
- Consolidate duplicated endpoints and align backend routing modules.
- Remove Supabase anonymous keys from the frontend bundle and tighten CORS.
- Expand automated testing (Vitest, pytest) and add CI coverage.
- Unify AI provider usage via OpenRouter or a shared abstraction layer.

## Stakeholders
- **Engineering** – Multiple contributors touching frontend, backend, and database migrations.
- **Operations** – Maintenance scripts and scheduling flows indicate involvement from operational teams.
- **AI/Automation** – Prompts, agents, and edge functions are actively maintained for document and chat automation.

## Timeline Signals
- More than forty Supabase migrations indicate continuous schema evolution.
- Recent commits (e.g., RLS adjustments, schema fixes) show active production stabilization.
- Git history in this working tree is truncated; syncing with the primary remote is recommended for deeper analysis.

## Current Status
- **Frontend**: Functional for major flows; several components still rely on both direct Supabase access and backend APIs.
- **Backend**: Powerful but monolithic—`backend/main.py` hosts most routes and AI orchestration without modular routers or automated tests.
- **Infrastructure**: Railway deploy for FastAPI, Supabase for data/storage, and Vercel-style functions (`/api`) with placeholder responses.
- **Security**: JWT tokens stored in `localStorage`, Supabase keys exposed in the bundle, permissive CORS, and no rate limiting.

## Known Issues
- Supabase functions request the non-existent model `gpt-5-mini-2025-08-07`, causing failures.
- Duplicate handlers for `/api/chat-sessions` and `/api/generate-report` in the backend.
- Outdated Vitest specs (`src/pages/Dashboard.test.tsx`) no longer match the current dashboard implementation.
- Supabase anonymous key hardcoded in `src/integrations/supabase/client.ts`.
- JWT tokens expire silently and lack refresh flows, resulting in poor UX and security gaps.
