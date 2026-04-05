# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Zod schema for `process.env` validation in `server/_core/env.ts` — prevents startup with missing secrets
- `/api/ready` readiness probe endpoint — returns `{ ready: true }` when critical environment variables are present, `503` otherwise
- CI pipeline (`.github/workflows/ci.yml`) with type-check, format-check, test with coverage upload, build, and Docker build stages
- Coverage thresholds enforced in `vitest.config.ts` (lines/functions/branches/statements ≥ 80 %)

## [1.0.0-alpha] — 2026-03-11

### Added

- Initial production-grade chatbot for KSAC library with MySQL database integration
- AI-powered RAG (Retrieval-Augmented Generation) pipeline using OpenAI embeddings
- Streaming chat via `ai` SDK (`/api/chat`)
- tRPC API layer for typed client–server communication
- User authentication with JWT cookies and OAuth support
- Admin panel: resource sync, conversation management, PDF ingestion
- Rate limiting per route (`/api/chat` 5/min, `/api/trpc` 60/min, `/api/oauth` 10/min)
- Structured logging via `logger.*` (no raw `console.*` in server code)
- Graceful shutdown on `SIGTERM`/`SIGINT` with configurable timeout
- Security headers via `helmet` (strict CSP in production)
- Node-cache reply cache (24 h TTL) keyed on language + last-5-history + prompt
- 376 tests across 21 files; overall coverage ≥ 80 %

[Unreleased]: https://github.com/donkeyhotshow/hdak-lib-chatbot/compare/v1.0.0-alpha...HEAD
[1.0.0-alpha]: https://github.com/donkeyhotshow/hdak-lib-chatbot/releases/tag/v1.0.0-alpha
