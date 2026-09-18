# Photo Recall Discovery Engine

An AI-powered, evidence-traceable research system for understanding why people fail to retrieve
specific photos when their memory is incomplete.

## Current stage

Stage 1 establishes a React frontend and Cloudflare Worker API as one deployable application. No
external APIs, databases, or AI secrets are required yet.

## Local setup

```powershell
pnpm.cmd install
pnpm.cmd run dev
```

## Validation

```powershell
pnpm.cmd run check
pnpm.cmd run build
```

## Secrets

When integrations begin, copy `.dev.vars.example` to `.dev.vars` and add values locally. Never
commit `.dev.vars`, `.env`, API keys, or tokens.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the staged system design.

