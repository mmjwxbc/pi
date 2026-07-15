import {
	Agent,
	formatPromptTemplateInvocation,
	formatSkillInvocation,
	type AgentEvent,
	type AgentMessage,
	type AgentOptions,
	type AgentTool,
	type PromptTemplate,
	type Skill,
} from "@earendil-works/pi-agent-core";

export interface BrowserSessionSnapshot {
	messages: AgentMessage[];
	activeToolNames: string[];
}

export interface BrowserSessionStore {
	load(): Promise<BrowserSessionSnapshot | undefined>;
	save(snapshot: BrowserSessionSnapshot): Promise<void>;
}

export interface BrowserAgentResources {
	skills?: Skill[];
	promptTemplates?: PromptTemplate[];
}

export interface BrowserToolDefinition<TParams = any, TDetails = unknown> extends AgentTool<TParams, TDetails> {
	promptSnippet?: string;
	promptGuidelines?: string[];
}

export interface BrowserAgentSessionOptions extends AgentOptions {
	store?: BrowserSessionStore;
	tools?: BrowserToolDefinition[];
	activeToolNames?: string[];
	resources?: BrowserAgentResources;
}

function cloneSnapshot(snapshot: BrowserSessionSnapshot): BrowserSessionSnapshot {
	return {
		messages: snapshot.messages.slice(),
		activeToolNames: snapshot.activeToolNames.slice(),
	};
}

export class MemoryBrowserSessionStore implements BrowserSessionStore {
	private snapshot?: BrowserSessionSnapshot;

	constructor(initial?: BrowserSessionSnapshot) {
		this.snapshot = initial ? cloneSnapshot(initial) : undefined;
	}

	async load(): Promise<BrowserSessionSnapshot | undefined> {
		return this.snapshot ? cloneSnapshot(this.snapshot) : undefined;
	}

	async save(snapshot: BrowserSessionSnapshot): Promise<void> {
		this.snapshot = cloneSnapshot(snapshot);
	}
}

export class BrowserAgentSession {
	readonly agent: Agent;
	private readonly store?: BrowserSessionStore;
	private readonly tools = new Map<string, BrowserToolDefinition>();
	private resources: BrowserAgentResources;
	private activeNames: string[];
	private readonly listeners = new Set<(event: AgentEvent) => void | Promise<void>>();

	constructor(options: BrowserAgentSessionOptions, restored?: BrowserSessionSnapshot) {
		this.store = options.store;
		this.resources = options.resources ?? {};
		for (const tool of options.tools ?? []) {
			if (this.tools.has(tool.name)) throw new Error(`Duplicate tool: ${tool.name}`);
			this.tools.set(tool.name, tool);
		}
		this.activeNames = restored?.activeToolNames ?? options.activeToolNames ?? [...this.tools.keys()];
		this.validateToolNames(this.activeNames);
		this.agent = new Agent({
			...options,
			initialState: {
				...options.initialState,
				messages: restored?.messages ?? options.initialState?.messages,
				tools: this.resolveActiveTools(),
			},
		});
		this.agent.subscribe(async (event) => {
			for (const listener of this.listeners) await listener(event);
			if (event.type === "message_end") await this.persist();
		});
	}

	get messages(): readonly AgentMessage[] {
		return this.agent.state.messages;
	}

	get activeToolNames(): readonly string[] {
		return this.activeNames;
	}

	subscribe(listener: (event: AgentEvent) => void | Promise<void>): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	async prompt(text: string): Promise<void> {
		await this.agent.prompt(text);
	}

	async skill(name: string, additionalInstructions?: string): Promise<void> {
		const skill = this.resources.skills?.find((candidate) => candidate.name === name);
		if (!skill) throw new Error(`Unknown skill: ${name}`);
		const invocation = formatSkillInvocation(skill);
		await this.prompt(additionalInstructions ? `${invocation}\n\n${additionalInstructions}` : invocation);
	}

	async promptTemplate(name: string, args: string[] = []): Promise<void> {
		const template = this.resources.promptTemplates?.find((candidate) => candidate.name === name);
		if (!template) throw new Error(`Unknown prompt template: ${name}`);
		await this.prompt(formatPromptTemplateInvocation(template, args));
	}

	setResources(resources: BrowserAgentResources): void {
		this.resources = resources;
	}

	setActiveTools(names: string[]): void {
		this.validateToolNames(names);
		this.activeNames = names.slice();
		this.agent.state.tools = this.resolveActiveTools();
		void this.persist();
	}

	abort(): void {
		this.agent.abort();
	}

	waitForIdle(): Promise<void> {
		return this.agent.waitForIdle();
	}

	private validateToolNames(names: readonly string[]): void {
		const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
		if (duplicates.length > 0) throw new Error(`Duplicate active tool(s): ${[...new Set(duplicates)].join(", ")}`);
		const missing = names.filter((name) => !this.tools.has(name));
		if (missing.length > 0) throw new Error(`Unknown tool(s): ${missing.join(", ")}`);
	}

	private resolveActiveTools(): AgentTool[] {
		return this.activeNames.map((name) => this.tools.get(name)!);
	}

	private async persist(): Promise<void> {
		await this.store?.save({
			messages: this.agent.state.messages.slice(),
			activeToolNames: this.activeNames.slice(),
		});
	}
}

export async function createBrowserAgentSession(options: BrowserAgentSessionOptions): Promise<BrowserAgentSession> {
	const restored = await options.store?.load();
	return new BrowserAgentSession(options, restored);
}
