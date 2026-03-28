import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

// str_replace_editor — create
test("shows 'Creating <file>' for str_replace_editor create command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "ok",
      }}
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

// str_replace_editor — str_replace
test("shows 'Editing <file>' for str_replace_editor str_replace command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolCallId: "2",
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/components/Card.jsx" },
        state: "result",
        result: "ok",
      }}
    />
  );
  expect(screen.getByText("Editing Card.jsx")).toBeDefined();
});

// str_replace_editor — insert
test("shows 'Editing <file>' for str_replace_editor insert command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolCallId: "3",
        toolName: "str_replace_editor",
        args: { command: "insert", path: "/index.js" },
        state: "call",
      }}
    />
  );
  expect(screen.getByText("Editing index.js")).toBeDefined();
});

// str_replace_editor — view
test("shows 'Reading <file>' for str_replace_editor view command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolCallId: "4",
        toolName: "str_replace_editor",
        args: { command: "view", path: "/utils/helpers.ts" },
        state: "result",
        result: "file contents",
      }}
    />
  );
  expect(screen.getByText("Reading helpers.ts")).toBeDefined();
});

// str_replace_editor — undo_edit
test("shows 'Reverting <file>' for str_replace_editor undo_edit command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolCallId: "5",
        toolName: "str_replace_editor",
        args: { command: "undo_edit", path: "/App.jsx" },
        state: "result",
        result: "ok",
      }}
    />
  );
  expect(screen.getByText("Reverting App.jsx")).toBeDefined();
});

// file_manager — delete
test("shows 'Deleting <file>' for file_manager delete command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolCallId: "6",
        toolName: "file_manager",
        args: { command: "delete", path: "/old-component.jsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );
  expect(screen.getByText("Deleting old-component.jsx")).toBeDefined();
});

// file_manager — rename
test("shows 'Renaming <file> to <new_file>' for file_manager rename command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolCallId: "7",
        toolName: "file_manager",
        args: { command: "rename", path: "/Button.jsx", new_path: "/components/Button.jsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );
  expect(screen.getByText("Renaming Button.jsx to Button.jsx")).toBeDefined();
});

// Unknown tool falls back to tool name
test("falls back to tool name for unknown tools", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolCallId: "8",
        toolName: "some_other_tool",
        args: {},
        state: "result",
        result: "ok",
      }}
    />
  );
  expect(screen.getByText("some_other_tool")).toBeDefined();
});

// Loading state — shows spinner, not green dot
test("shows spinner when state is not result", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={{
        toolCallId: "9",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "call",
      }}
    />
  );
  // Spinner has animate-spin class
  expect(container.querySelector(".animate-spin")).toBeDefined();
  // No green dot
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

// Done state — shows green dot, not spinner
test("shows green dot when state is result with a result value", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={{
        toolCallId: "10",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "ok",
      }}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

// Nested path — only shows filename
test("extracts filename from nested path", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolCallId: "11",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/src/components/ui/Button.tsx" },
        state: "result",
        result: "ok",
      }}
    />
  );
  expect(screen.getByText("Creating Button.tsx")).toBeDefined();
});
