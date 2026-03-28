import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { MockLanguageModel, getLanguageModel } from "@/lib/provider";

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn((model: string) => ({ _type: "anthropic-model", model })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// --- getLanguageModel ---

test("getLanguageModel returns a MockLanguageModel when ANTHROPIC_API_KEY is absent", () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  const model = getLanguageModel();
  expect(model).toBeInstanceOf(MockLanguageModel);
});

test("getLanguageModel returns a MockLanguageModel when ANTHROPIC_API_KEY is whitespace", () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "   ");
  const model = getLanguageModel();
  expect(model).toBeInstanceOf(MockLanguageModel);
});

test("getLanguageModel returns an anthropic model when ANTHROPIC_API_KEY is set", async () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
  const { anthropic } = await import("@ai-sdk/anthropic");

  getLanguageModel();

  expect(anthropic).toHaveBeenCalledWith("claude-haiku-4-5");
});

// --- MockLanguageModel: constructor & metadata ---

test("MockLanguageModel stores the modelId passed to the constructor", () => {
  const model = new MockLanguageModel("test-model");
  expect(model.modelId).toBe("test-model");
  expect(model.provider).toBe("mock");
  expect(model.specificationVersion).toBe("v1");
});

// --- MockLanguageModel: doGenerate (step 0 — toolMessageCount === 0) ---

test("doGenerate on step 0 creates App.jsx via tool call (default counter component)", async () => {
  const model = new MockLanguageModel("m");
  const result = await model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular" },
    prompt: [
      { role: "user", content: [{ type: "text", text: "make a counter" }] },
    ],
  } as any);

  expect(result.toolCalls).toHaveLength(1);
  expect(result.toolCalls[0].toolName).toBe("str_replace_editor");
  const args = JSON.parse(result.toolCalls[0].args as string);
  expect(args.command).toBe("create");
  expect(args.path).toBe("/App.jsx");
});

test("doGenerate on step 0 detects 'form' in prompt and creates ContactForm App.jsx", async () => {
  const model = new MockLanguageModel("m");
  const result = await model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular" },
    prompt: [
      { role: "user", content: [{ type: "text", text: "create a contact form" }] },
    ],
  } as any);

  const args = JSON.parse(result.toolCalls[0].args as string);
  expect(args.path).toBe("/App.jsx");
  // App.jsx should import ContactForm
  expect(args.file_text).toContain("ContactForm");
});

test("doGenerate on step 0 detects 'card' in prompt and creates Card App.jsx", async () => {
  const model = new MockLanguageModel("m");
  const result = await model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular" },
    prompt: [
      { role: "user", content: [{ type: "text", text: "show me a card component" }] },
    ],
  } as any);

  const args = JSON.parse(result.toolCalls[0].args as string);
  expect(args.file_text).toContain("Card");
});

// --- MockLanguageModel: doGenerate (step 1 — toolMessageCount === 1) ---

test("doGenerate on step 1 creates the component file", async () => {
  const model = new MockLanguageModel("m");
  const result = await model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular" },
    prompt: [
      { role: "user", content: [{ type: "text", text: "counter" }] },
      { role: "tool", content: [{ type: "tool-result", toolCallId: "c1", toolName: "t", result: "" }] },
    ],
  } as any);

  expect(result.toolCalls).toHaveLength(1);
  const args = JSON.parse(result.toolCalls[0].args as string);
  expect(args.command).toBe("create");
  expect(args.path).toBe("/components/Counter.jsx");
});

// --- MockLanguageModel: doGenerate (step 2 — toolMessageCount === 2) ---

test("doGenerate on step 2 issues a str_replace to enhance the component", async () => {
  const model = new MockLanguageModel("m");
  const toolMsg = { role: "tool", content: [{ type: "tool-result", toolCallId: "c", toolName: "t", result: "" }] };
  const result = await model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular" },
    prompt: [
      { role: "user", content: [{ type: "text", text: "counter" }] },
      toolMsg,
      toolMsg,
    ],
  } as any);

  expect(result.toolCalls).toHaveLength(1);
  const args = JSON.parse(result.toolCalls[0].args as string);
  expect(args.command).toBe("str_replace");
});

// --- MockLanguageModel: doGenerate (step 4+ — final summary) ---

test("doGenerate on step 3+ returns a text summary with no tool calls", async () => {
  const model = new MockLanguageModel("m");
  const toolMsg = { role: "tool", content: [{ type: "tool-result", toolCallId: "c", toolName: "t", result: "" }] };
  const result = await model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular" },
    prompt: [
      { role: "user", content: [{ type: "text", text: "counter" }] },
      toolMsg,
      toolMsg,
      toolMsg,
    ],
  } as any);

  expect(result.toolCalls).toHaveLength(0);
  expect(result.text).toContain("Counter");
  expect(result.finishReason).toBe("stop");
}, 15000);

// --- MockLanguageModel: extractUserPrompt edge cases ---

test("doGenerate returns empty text when there are no user messages", async () => {
  const model = new MockLanguageModel("m");
  // With only a system message, extractUserPrompt returns "" → defaults to counter
  const result = await model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular" },
    prompt: [
      { role: "system", content: "You are a helpful assistant." },
    ],
  } as any);

  // Should still produce a tool call (counter path, step 0)
  expect(result.toolCalls).toHaveLength(1);
});

test("doGenerate handles user messages with plain string content", async () => {
  const model = new MockLanguageModel("m");
  const result = await model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular" },
    prompt: [
      { role: "user", content: "make a form" },
    ],
  } as any);

  const args = JSON.parse(result.toolCalls[0].args as string);
  // App.jsx should contain ContactForm since "form" was in the prompt
  expect(args.file_text).toContain("ContactForm");
});

// --- MockLanguageModel: doStream ---

test("doStream returns a ReadableStream", async () => {
  const model = new MockLanguageModel("m");
  const response = await model.doStream({
    inputFormat: "messages",
    mode: { type: "regular" },
    prompt: [
      { role: "user", content: [{ type: "text", text: "counter" }] },
    ],
  } as any);

  expect(response.stream).toBeInstanceOf(ReadableStream);
});

test("doStream emits at least one text-delta and a finish part", async () => {
  const model = new MockLanguageModel("m");
  const response = await model.doStream({
    inputFormat: "messages",
    mode: { type: "regular" },
    prompt: [
      { role: "user", content: [{ type: "text", text: "counter" }] },
    ],
  } as any);

  const reader = response.stream.getReader();
  const parts: any[] = [];
  let done = false;
  while (!done) {
    const { value, done: d } = await reader.read();
    if (d) { done = true; } else { parts.push(value); }
  }

  expect(parts.some((p) => p.type === "text-delta")).toBe(true);
  expect(parts.some((p) => p.type === "finish")).toBe(true);
}, 10000);

// --- doGenerate: usage and rawCall shape ---

test("doGenerate returns usage and rawCall metadata", async () => {
  const model = new MockLanguageModel("m");
  const result = await model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular" },
    prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
  } as any);

  expect(result.usage).toMatchObject({
    promptTokens: expect.any(Number),
    completionTokens: expect.any(Number),
  });
  expect(result.rawCall).toHaveProperty("rawPrompt");
});
