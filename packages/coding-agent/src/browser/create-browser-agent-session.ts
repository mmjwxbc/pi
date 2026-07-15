import { Agent, type AgentOptions } from "@earendil-works/pi-agent-core";

/**
 * Options for a browser-hosted coding-agent session.
 *
 * This is intentionally the same runtime contract as pi-agent-core's Agent.
 * Browser applications own persistence, credentials, UI, and tool definitions.
 */
export type BrowserAgentSessionOptions = AgentOptions;

/**
 * Create a browser-safe agent session without loading the coding-agent CLI,
 * TUI, filesystem tools, shell integration, credential storage, or package
 * discovery.
 */
export function createBrowserAgentSession(options: BrowserAgentSessionOptions = {}): Agent {
	return new Agent(options);
}
