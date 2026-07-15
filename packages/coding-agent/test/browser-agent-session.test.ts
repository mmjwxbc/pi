import { type AssistantMessage, type AssistantMessageEvent, EventStream, getModel } from "@earendil-works/pi-ai/compat";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import {
	createBrowserAgentSession,
	MemoryBrowserSessionStore,
	type BrowserToolDefinition,
} from "../src/browser/index.ts";

class MockStream extends EventStream<AssistantMessageEvent, AssistantMessage> {
	constructor(message: AssistantMessage) {
		super(
			(event) => event.type === "done" || event.type === "error",
			(event) => (event.type === "done" ? event.message : event.error),
		);
		queueMicrotask(() => this.push({ type: "done", reason: "stop", message }));
	}
}

function assistant(text: string): AssistantMessage {
	return {
		role: "assistant",
		content: [{ type: "text", text }],
		api: "openai-responses",
		provider: "openai",
		model: "mock",
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		stopReason: "stop",
		timestamp: Date.now(),
	};
}

const canvasTool: BrowserToolDefinition = {
	name: "get_canvas_snapshot",
	label: "Canvas snapshot",
	description: "Read the current canvas graph",
	parameters: Type.Object({}),
	execute: async () => ({ content: [{ type: "text", text: "{}" }], details: {} }),
};

describe("BrowserAgentSession", () => {
	it("restores and persists browser session state", async () => {
		const model = getModel("openai", "gpt-4o-mini");
		const store = new MemoryBrowserSessionStore({
			messages: [{ role: "user", content: [{ type: "text", text: "restored" }], timestamp: 1 }],
			activeToolNames: [],
		});
		const session = await createBrowserAgentSession({
			model,
			store,
			streamFn: () => new MockStream(assistant("saved")),
		});

		expect(session.messages[0]?.role).toBe("user");
		await session.prompt("hello");
		expect((await store.load())?.messages.at(-1)?.role).toBe("assistant");
	});

	it("owns tool registration and active tool selection", async () => {
		const session = await createBrowserAgentSession({
			model: getModel("openai", "gpt-4o-mini"),
			tools: [canvasTool],
			activeToolNames: [],
		});
		expect(session.activeToolNames).toEqual([]);
		await session.setActiveTools(["get_canvas_snapshot"]);
		expect(session.activeToolNames).toEqual(["get_canvas_snapshot"]);
		expect(session.agent.state.tools.map((tool) => tool.name)).toEqual(["get_canvas_snapshot"]);
	});

	it("invokes static skills and prompt templates", async () => {
		const prompts: string[] = [];
		const session = await createBrowserAgentSession({
			model: getModel("openai", "gpt-4o-mini"),
			resources: {
				skills: [{ name: "canvas", description: "Edit canvas", content: "Use canvas tools.", filePath: "/skills/canvas/SKILL.md" }],
				promptTemplates: [{ name: "storyboard", content: "Create $1 shots" }],
			},
			streamFn: (_model, context) => {
				const latest = context.messages.at(-1);
				if (latest?.role === "user") prompts.push(latest.content.map((part) => part.type === "text" ? part.text : "").join(""));
				return new MockStream(assistant("ok"));
			},
		});

		await session.skill("canvas", "Only propose changes");
		await session.promptTemplate("storyboard", ["12"]);
		expect(prompts[0]).toContain("<skill name=\"canvas\"");
		expect(prompts[0]).toContain("Only propose changes");
		expect(prompts[1]).toBe("Create 12 shots");
	});
});
