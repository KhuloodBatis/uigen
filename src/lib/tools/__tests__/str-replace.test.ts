import { test, expect, vi, beforeEach } from "vitest";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";
import { VirtualFileSystem } from "@/lib/file-system";

vi.mock("@/lib/file-system", () => ({
  VirtualFileSystem: vi.fn().mockImplementation(() => ({
    viewFile: vi.fn(),
    createFileWithParents: vi.fn(),
    replaceInFile: vi.fn(),
    insertInFile: vi.fn(),
  })),
}));

function makeFs() {
  return new VirtualFileSystem() as unknown as {
    viewFile: ReturnType<typeof vi.fn>;
    createFileWithParents: ReturnType<typeof vi.fn>;
    replaceInFile: ReturnType<typeof vi.fn>;
    insertInFile: ReturnType<typeof vi.fn>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- view ---

test("view command calls fileSystem.viewFile with path and no range", async () => {
  const fs = makeFs();
  fs.viewFile.mockReturnValue("line 1\nline 2");
  const tool = buildStrReplaceTool(fs as any);

  const result = await tool.execute({
    command: "view",
    path: "/App.jsx",
  });

  expect(fs.viewFile).toHaveBeenCalledWith("/App.jsx", undefined);
  expect(result).toBe("line 1\nline 2");
});

test("view command passes view_range to fileSystem.viewFile", async () => {
  const fs = makeFs();
  fs.viewFile.mockReturnValue("line 2\nline 3");
  const tool = buildStrReplaceTool(fs as any);

  await tool.execute({
    command: "view",
    path: "/App.jsx",
    view_range: [2, 3],
  });

  expect(fs.viewFile).toHaveBeenCalledWith("/App.jsx", [2, 3]);
});

// --- create ---

test("create command calls createFileWithParents with path and file_text", async () => {
  const fs = makeFs();
  fs.createFileWithParents.mockReturnValue("File created");
  const tool = buildStrReplaceTool(fs as any);

  const result = await tool.execute({
    command: "create",
    path: "/components/Button.jsx",
    file_text: "export default function Button() {}",
  });

  expect(fs.createFileWithParents).toHaveBeenCalledWith(
    "/components/Button.jsx",
    "export default function Button() {}"
  );
  expect(result).toBe("File created");
});

test("create command uses empty string when file_text is omitted", async () => {
  const fs = makeFs();
  fs.createFileWithParents.mockReturnValue("File created");
  const tool = buildStrReplaceTool(fs as any);

  await tool.execute({ command: "create", path: "/empty.jsx" });

  expect(fs.createFileWithParents).toHaveBeenCalledWith("/empty.jsx", "");
});

// --- str_replace ---

test("str_replace command calls replaceInFile with path, old_str, and new_str", async () => {
  const fs = makeFs();
  fs.replaceInFile.mockReturnValue("Replaced successfully");
  const tool = buildStrReplaceTool(fs as any);

  const result = await tool.execute({
    command: "str_replace",
    path: "/App.jsx",
    old_str: "Hello",
    new_str: "World",
  });

  expect(fs.replaceInFile).toHaveBeenCalledWith("/App.jsx", "Hello", "World");
  expect(result).toBe("Replaced successfully");
});

test("str_replace falls back to empty strings when old_str and new_str are omitted", async () => {
  const fs = makeFs();
  fs.replaceInFile.mockReturnValue("ok");
  const tool = buildStrReplaceTool(fs as any);

  await tool.execute({ command: "str_replace", path: "/App.jsx" });

  expect(fs.replaceInFile).toHaveBeenCalledWith("/App.jsx", "", "");
});

// --- insert ---

test("insert command calls insertInFile with path, insert_line, and new_str", async () => {
  const fs = makeFs();
  fs.insertInFile.mockReturnValue("Inserted");
  const tool = buildStrReplaceTool(fs as any);

  const result = await tool.execute({
    command: "insert",
    path: "/App.jsx",
    insert_line: 5,
    new_str: "// inserted line",
  });

  expect(fs.insertInFile).toHaveBeenCalledWith("/App.jsx", 5, "// inserted line");
  expect(result).toBe("Inserted");
});

test("insert falls back to line 0 and empty string when args are omitted", async () => {
  const fs = makeFs();
  fs.insertInFile.mockReturnValue("ok");
  const tool = buildStrReplaceTool(fs as any);

  await tool.execute({ command: "insert", path: "/App.jsx" });

  expect(fs.insertInFile).toHaveBeenCalledWith("/App.jsx", 0, "");
});

// --- undo_edit ---

test("undo_edit command returns an unsupported error message", async () => {
  const fs = makeFs();
  const tool = buildStrReplaceTool(fs as any);

  const result = await tool.execute({ command: "undo_edit", path: "/App.jsx" });

  expect(result).toContain("undo_edit command is not supported");
  expect(fs.viewFile).not.toHaveBeenCalled();
  expect(fs.replaceInFile).not.toHaveBeenCalled();
});

// --- tool shape ---

test("buildStrReplaceTool returns a tool with id str_replace_editor", () => {
  const fs = makeFs();
  const tool = buildStrReplaceTool(fs as any);

  expect(tool.id).toBe("str_replace_editor");
  expect(typeof tool.execute).toBe("function");
  expect(tool.parameters).toBeDefined();
});
