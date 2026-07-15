import { type AssistantMessage, type AssistantMessageEvent, EventStream, getModel } from "@earendil-works/pi-ai/compat";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import {
	createBrowserAgentSession,
	MemoryBrowserSessionStore,
	type BrowserSessionSnapshot,
	type BrowserToolDefinition,
} from "../src/browser/index.ts";

class MockAssistantStream extends EventStream<AssistantMessageEvent, Assistant