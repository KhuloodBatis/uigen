"use client";

import { Loader2 } from "lucide-react";

interface StrReplaceEditorArgs {
  command: "view" | "create" | "str_replace" | "insert" | "undo_edit";
  path: string;
}

interface FileManagerArgs {
  command: "rename" | "delete";
  path: string;
  new_path?: string;
}

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: "partial-call" | "call" | "result";
  result?: unknown;
}

function getFileName(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

function getFriendlyLabel(tool: ToolInvocation): string {
  if (tool.toolName === "str_replace_editor") {
    const args = tool.args as StrReplaceEditorArgs;
    const file = getFileName(args.path);
    switch (args.command) {
      case "create":
        return `Creating ${file}`;
      case "str_replace":
      case "insert":
        return `Editing ${file}`;
      case "view":
        return `Reading ${file}`;
      case "undo_edit":
        return `Reverting ${file}`;
    }
  }

  if (tool.toolName === "file_manager") {
    const args = tool.args as FileManagerArgs;
    const file = getFileName(args.path);
    switch (args.command) {
      case "rename":
        const newFile = args.new_path ? getFileName(args.new_path) : "";
        return newFile ? `Renaming ${file} to ${newFile}` : `Renaming ${file}`;
      case "delete":
        return `Deleting ${file}`;
    }
  }

  return tool.toolName;
}

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const isDone = toolInvocation.state === "result" && toolInvocation.result != null;
  const label = getFriendlyLabel(toolInvocation);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
