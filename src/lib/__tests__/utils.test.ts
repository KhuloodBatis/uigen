import { test, expect } from "vitest";
import { cn } from "@/lib/utils";

// --- happy paths ---

test("returns a single class unchanged", () => {
  expect(cn("foo")).toBe("foo");
});

test("merges multiple class strings", () => {
  expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
});

test("handles conditional classes via objects", () => {
  expect(cn("base", { active: true, disabled: false })).toBe("base active");
});

test("handles conditional classes via arrays", () => {
  expect(cn(["foo", "bar"])).toBe("foo bar");
});

// --- Tailwind conflict resolution ---

test("last Tailwind utility wins for conflicting classes", () => {
  // twMerge resolves p-2 vs p-4 — the latter should win
  expect(cn("p-2", "p-4")).toBe("p-4");
});

test("merges non-conflicting Tailwind utilities without dropping any", () => {
  const result = cn("text-sm", "font-bold");
  expect(result).toContain("text-sm");
  expect(result).toContain("font-bold");
});

test("last text colour wins over the first", () => {
  expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
});

// --- edge cases ---

test("ignores falsy values without throwing", () => {
  expect(cn("foo", undefined, null as any, false as any, "bar")).toBe("foo bar");
});

test("returns an empty string when called with no arguments", () => {
  expect(cn()).toBe("");
});

test("returns an empty string when all arguments are falsy", () => {
  expect(cn(undefined, null as any, false as any)).toBe("");
});
