import { createAssistantMessageEventStream, Type } from "@earendil-works/pi-ai";
import { complete, getModel, getProviders } from "@earendil-works/pi-ai/compat";
import {
	Agent,
	bashExecutionToText,
	convertToLlm,
	createCustomMessage,
	FileError,
	formatPromptTemplateInvocation,
	formatSkillInvocation,
	formatSkillsForSystemPrompt,
	getOrThrow,
	InMemorySession