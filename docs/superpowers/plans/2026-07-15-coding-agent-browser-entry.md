# Coding Agent Browser Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser-safe `@earendil-works/pi-coding-agent/browser` entry that exposes the core agent loop and session primitives without importing CLI, TUI, filesystem, shell, or native Node dependencies.

**Architecture:** The new subpath is an explicit browser boundary. It imports only browser-smoke-tested exports from `@earendil-works/pi-agent-core` and provides a small `createBrowserAgentSession()` factory around `Agent`. The existing package root remains unchanged and continues to serve Node/CLI consumers.

**Tech Stack:** TypeScript, npm workspaces, esbuild browser smoke check, Vitest.

## Global Constraints

- Node.js remains `>=22.19.0`.
- The browser entry must not import `node:*`, `fs`, `path`, `os`, `child_process`, `@earendil-works/pi-tui`, or native image packages.
- Built-in coding tools are not exported from the browser entry.
- The existing Node package root and CLI behavior must remain unchanged.

---

### Task 1: Lock the browser subpath contract with a failing smoke test

**Files:**
- Modify: `scripts/browser-smoke-entry.ts`

**Interfaces:**
- Consumes: package subpath `@earendil-works/pi-coding-agent/browser`
- Produces: a browser bundle regression test for `createBrowserAgentSession`

- [ ] Import `createBrowserAgentSession` and browser-safe session helpers from the new subpath.
- [ ] Instantiate the session with the existing smoke-test model.
- [ ] Run `npm run check:browser-smoke` and verify it fails because the subpath is not exported.

### Task 2: Add the browser-safe package entry

**Files:**
- Create: `packages/coding-agent/src/browser/create-browser-agent-session.ts`
- Create: `packages/coding-agent/src/browser/index.ts`
- Modify: `packages/coding-agent/package.json`

**Interfaces:**
- Produces: `createBrowserAgentSession(options?: AgentOptions): Agent`
- Produces: `BrowserAgentSession` type alias
- Re-exports: selected agent, harness, in-memory session, compaction, skills, and prompt-template primitives from `pi-agent-core`

- [ ] Implement the minimal factory using `new Agent(options)`.
- [ ] Export only browser-safe symbols from the browser entry.
- [ ] Add the `./browser` package export with types and ESM import targets.
- [ ] Run `npm run build` and `npm run check:browser-smoke`; both must pass.

### Task 3: Verify compatibility and publish the branch

**Files:**
- Verify all changed files.

**Interfaces:**
- Consumes: root build/check/test scripts
- Produces: a draft pull request against `main`

- [ ] Run `npm run build`.
- [ ] Run `npm run check`.
- [ ] Run `npm test`.
- [ ] Inspect the final diff for accidental Node-only imports.
- [ ] Push `agent/coding-agent-browser-entry` and open a draft PR.
