import test from "node:test";
import assert from "node:assert/strict";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createExecCommandTracker } from "../src/tools/exec/command-state.ts";
import { formatCollapsedExecOutputPreview, registerExecCommandTool } from "../src/tools/exec/command-tool.ts";

function createTheme() {
	return {
		fg: (_role: string, text: string) => text,
		bold: (text: string) => text,
	};
}

function renderComponentText(component: { render(width: number): string[] } | undefined): string {
	assert.ok(component);
	return component.render(120).map((line) => line.trimEnd()).join("\n").trim();
}

function createRegisteredExecTool(options: { showOutputWhenCollapsed?: boolean } = {}) {
	let tool:
		| {
				renderResult?: (
					result: { content: Array<{ type: string; text?: string }>; details?: unknown },
					options: { expanded: boolean; isPartial: boolean },
					theme: ReturnType<typeof createTheme>,
					context?: { toolCallId?: string; args?: { cmd?: string } },
				) => { render(width: number): string[] };
		  }
		| undefined;
	const pi = {
		registerTool(definition: typeof tool) {
			tool = definition;
		},
	} as unknown as ExtensionAPI;
	registerExecCommandTool(pi, createExecCommandTracker(), {} as never, options);
	assert.ok(tool);
	return tool;
}

test("collapsed exec output preview shows tail lines and omitted count", () => {
	const preview = formatCollapsedExecOutputPreview({
		chunk_id: "chunk",
		wall_time_seconds: 0.82,
		exit_code: 0,
		output: "one\ntwo\nthree\nfour\nfive\nsix\nseven\n",
	});

	assert.equal(preview, "... (3 earlier lines, ctrl+o to expand)\nfour\nfive\nsix\nseven\nTook 0.8s");
});

test("exec_command can show shell output when global tool expansion is collapsed", () => {
	const tool = createRegisteredExecTool({ showOutputWhenCollapsed: true });
	const rendered = renderComponentText(
		tool.renderResult?.(
			{
				content: [{ type: "text", text: "" }],
				details: { chunk_id: "chunk", wall_time_seconds: 0.1, exit_code: 0, output: "alpha\nbeta\n" },
			},
			{ expanded: false, isPartial: false },
			createTheme(),
			{ toolCallId: "call", args: { cmd: "printf" } },
		),
	);

	assert.equal(rendered, "alpha\n    beta\n    Took 0.1s");
});

test("exec_command hides shell output when collapsed preview is off", () => {
	const tool = createRegisteredExecTool({ showOutputWhenCollapsed: false });
	const rendered = renderComponentText(
		tool.renderResult?.(
			{
				content: [{ type: "text", text: "" }],
				details: { chunk_id: "chunk", wall_time_seconds: 0.1, exit_code: 0, output: "alpha\n" },
			},
			{ expanded: false, isPartial: false },
			createTheme(),
			{ toolCallId: "call", args: { cmd: "printf" } },
		),
	);

	assert.equal(rendered, "");
});
