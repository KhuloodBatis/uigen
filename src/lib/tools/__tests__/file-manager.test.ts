import { test, expect, vi, beforeEach } from "vitest";
import { buildFileManagerTool } from "@/lib/tools/file-manager";
import { VirtualFileSystem } from "@/lib/file-system";

vi.mock("../file-system", () => ({
  VirtualFileSystem: vi.fn(),
}));

// Mock the "ai" package so the tool() wrapper just returns its input
vi.mock("ai", () => ({
  tool: vi.fn((def) => def),
}));

function makeFs() {
  return {
    rename: vi.fn(),
    deleteFile: vi.fn(),
  } as unknown as VirtualFileSystem;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- rename ---

test("rename returns success when fileSystem.rename returns true", async () => {
  const fs = makeFs();
  (fs.rename as ReturnType<typeof vi.fn>).mockReturnValue(true);
  const tool = buildFileManagerTool(fs);

  const result = await tool.execute({
    command: "rename",
    path: "/old.jsx",
    new_path: "/new.jsx",
  });

  expect(fs.rename).toHaveBeenCalledWith("/old.jsx", "/new.jsx");
  expect(result).toEqual({
    success: true,
    message: "Successfully renamed /old.jsx to /new.jsx",
  });
});

test("rename returns failure when fileSystem.rename returns false", async () => {
  const fs = makeFs();
  (fs.rename as ReturnType<typeof vi.fn>).mockReturnValue(false);
  const tool = buildFileManagerTool(fs);

  const result = await tool.execute({
    command: "rename",
    path: "/missing.jsx",
    new_path: "/new.jsx",
  });

  expect(result).toEqual({
    success: false,
    error: "Failed to rename /missing.jsx to /new.jsx",
  });
});

test("rename returns an error when new_path is not provided", async () => {
  const fs = makeFs();
  const tool = buildFileManagerTool(fs);

  const result = await tool.execute({ command: "rename", path: "/old.jsx" });

  expect(fs.rename).not.toHaveBeenCalled();
  expect(result).toEqual({
    success: false,
    error: "new_path is required for rename command",
  });
});

// --- delete ---

test("delete returns success when fileSystem.deleteFile returns true", async () => {
  const fs = makeFs();
  (fs.deleteFile as ReturnType<typeof vi.fn>).mockReturnValue(true);
  const tool = buildFileManagerTool(fs);

  const result = await tool.execute({ command: "delete", path: "/App.jsx" });

  expect(fs.deleteFile).toHaveBeenCalledWith("/App.jsx");
  expect(result).toEqual({
    success: true,
    message: "Successfully deleted /App.jsx",
  });
});

test("delete returns failure when fileSystem.deleteFile returns false", async () => {
  const fs = makeFs();
  (fs.deleteFile as ReturnType<typeof vi.fn>).mockReturnValue(false);
  const tool = buildFileManagerTool(fs);

  const result = await tool.execute({ command: "delete", path: "/ghost.jsx" });

  expect(result).toEqual({
    success: false,
    error: "Failed to delete /ghost.jsx",
  });
});

// --- tool shape ---

test("buildFileManagerTool returns an object with description, parameters, and execute", () => {
  const fs = makeFs();
  const tool = buildFileManagerTool(fs);

  expect(typeof tool.description).toBe("string");
  expect(tool.parameters).toBeDefined();
  expect(typeof tool.execute).toBe("function");
});
