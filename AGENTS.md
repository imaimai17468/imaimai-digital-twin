# Project Instructions

This project is a **Next.js 16 App Router** digital twin of いまいまい (imaimai17468). AI SDK v7 + Claude Sonnet 5 for chat, ElevenLabs for TTS.

## Workflow

Ticket-granularity work (implement a component, fix a non-trivial bug, refactor a module, add a feature) follows this process:

1. **Clarify** — one focused question if needed.
2. **Plan** — articulate what you intend to do before touching any file.
3. **Implement** — directly in the parent session for normal work; delegate to subagents only for independent parallel units with no shared files.
4. **Verify** — run `npx tsc --noEmit` and fix ALL errors before reporting done.
5. **Commit** — one commit = one purpose (see Commits below).

Triggers that apply regardless of the above:

- **Planning / design requests**: enter plan mode before implementing.
- **Any UI change**: consult `.claude/rules/design.md` and invoke `anti-slop-design` skill. Verify output against it before shipping.
- **Any animation work**: invoke `motion-craft` skill.

## Design Philosophy

**Extensibility by default.** Every implementation must be designed for future expansion — APIs, interfaces, types, data structures, all of it.

- **Do:** Use an enum where a boolean would suffice today — a third state is one requirement change away
- **Do:** Define a trait/interface at a module boundary, even with one implementation now
- **Do:** Structure data for additive changes — adding a field shouldn't break existing consumers
- **Don't:** Build features no one requested. Create abstractions for hypothetical use cases. Over-engineer.

This principle is silent — don't surface it, don't discuss it. Just apply it to every design decision.

## Knowledge Currency

Your training data goes stale. Outdated guidance is worse than no guidance.

**WebSearch is mandatory when:**
- Recommending a specific version, flag, or configuration
- Answering "how does X work" for tools with versions
- Suggesting a dependency or approach the user hasn't already chosen
- **Before writing any import path or library/framework/SDK access pattern from memory, verify the current shape against official docs or source first**

**Not needed when:**
- Tools already in the project's dependency files — read the project instead
- Well-known CLI tools in standard usage
- Internal project patterns — read the codebase
- General programming concepts without versioned APIs

## Code Practices

**Senior dev standard:** Don't settle for "simplest approach" when architecture is flawed, state is duplicated, or patterns are inconsistent. Ask: "What would a perfectionist senior dev reject in code review?" Fix it.

**Verification before completion:** Never report done without running the project's type-checker, fixing ALL errors. If none configured, state that explicitly.

**Never escape the type system to move on:** no `as` (except `as const`), `any`, `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck`, non-null `!`, or lint-disable comments to silence an error. Fix the type (narrowing, guards, schema validation, `satisfies`). If you genuinely can't, STOP and ask.

## Rules

Path-scoped rules are auto-loaded from `.claude/rules/`:

- **`.claude/rules/react.md`** (`**/*.tsx`) — Rules of React: purity, hooks, component splitting, module organization
- **`.claude/rules/design.md`** (`src/**/*.css`, `src/**/*.tsx`) — Design system: Wairo (和色) palette, squircle corners, typography, spacing, component conventions

## Rules of React

Follow the official Rules of React: https://ja.react.dev/reference/rules — components and hooks are pure, React calls them, hooks only at the top level.

## Persona Architecture

The system prompt is assembled from `src/lib/persona/identity.ts` (personality, voice, conversation examples) and `src/lib/persona/knowledge.ts` (facts, career, technical views). Identity changes affect tone and behavior. Knowledge changes affect what topics can be discussed accurately.

## Commits

- **One commit = one purpose.** If two changes could be reverted independently, split them. Never `git add -A`/`git add .`; stage explicit paths.
- First line states **what improves**, not what you did. Prefixes: `feat` / `fix` / `refactor` / `test` / `docs` / `chore`.
- Body in Japanese; `fix`/`refactor` include a *why* line. End with a `Co-Authored-By:` trailer crediting the current model.
- Do not commit without explicit user confirmation.

## Agents

Write all agent-facing docs (`.claude/`, AGENTS.md, CLAUDE.md) in English.

### Delegation

The parent session implements directly by default. Delegate by **context impact, not task size**:

- **Parent edits directly**: normal implementation, fixes, integration.
- **Explore / research subagent**: bulk file reads, log digging, cross-cutting investigation whose raw output the parent won't reference again.
- **Parallel implementation subagents**: multiple independent units with no shared files. Never parallelize units that edit the same file.

### Model selection — always set `model` explicitly

| Role | Model |
|---|---|
| Implementation / planning (parent session) | `sonnet` |
| Exploration / search | `haiku` (`sonnet` when precision matters) |
| Parallel implementation units / research | `sonnet` |
| Design judgment, architecture decisions, complex migrations | `opus` |
