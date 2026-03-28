import { test, expect, vi, beforeEach } from "vitest";

// Mock server-only so it doesn't throw in the test environment
vi.mock("server-only", () => ({}));

// Mock next/headers cookies
const mockCookieSet = vi.fn();
const mockCookieStore = { set: mockCookieSet };
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock jose so we can control the signed token output
vi.mock("jose", () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue("mocked-jwt-token"),
  })),
  jwtVerify: vi.fn(),
}));

import { createSession } from "@/lib/auth";

beforeEach(() => {
  vi.clearAllMocks();
});

test("sets an httpOnly cookie with the signed JWT token", async () => {
  await createSession("user-123", "user@example.com");

  expect(mockCookieSet).toHaveBeenCalledOnce();
  expect(mockCookieSet).toHaveBeenCalledWith(
    "auth-token",
    "mocked-jwt-token",
    expect.objectContaining({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    })
  );
});

test("sets cookie expiry approximately 7 days from now", async () => {
  const before = Date.now();
  await createSession("user-123", "user@example.com");
  const after = Date.now();

  const { expires } = mockCookieSet.mock.calls[0][2] as { expires: Date };
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("sets secure cookie in production environment", async () => {
  vi.stubEnv("NODE_ENV", "production");

  await createSession("user-123", "user@example.com");

  const options = mockCookieSet.mock.calls[0][2] as { secure: boolean };
  expect(options.secure).toBe(true);

  vi.unstubAllEnvs();
});

test("does not set secure cookie outside production", async () => {
  await createSession("user-123", "user@example.com");

  const options = mockCookieSet.mock.calls[0][2] as { secure: boolean };
  expect(options.secure).toBe(false);
});

test("signs JWT with the userId and email from arguments", async () => {
  const { SignJWT } = await import("jose");

  await createSession("user-42", "hello@test.com");

  expect(SignJWT).toHaveBeenCalledWith(
    expect.objectContaining({ userId: "user-42", email: "hello@test.com" })
  );
});

test("signs JWT using HS256 algorithm", async () => {
  const { SignJWT } = await import("jose");
  const mockInstance = {
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue("token"),
  };
  vi.mocked(SignJWT).mockImplementationOnce(() => mockInstance as any);

  await createSession("user-1", "a@b.com");

  expect(mockInstance.setProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
  expect(mockInstance.setExpirationTime).toHaveBeenCalledWith("7d");
});

// --- getSession ---

test("getSession returns null when no auth-token cookie is present", async () => {
  const mockCookieGet = vi.fn().mockReturnValue(undefined);
  const { cookies } = await import("next/headers");
  vi.mocked(cookies).mockResolvedValueOnce({ get: mockCookieGet } as any);

  const { getSession } = await import("@/lib/auth");
  const result = await getSession();

  expect(result).toBeNull();
});

test("getSession returns the decoded payload on a valid token", async () => {
  const payload = { userId: "u-1", email: "a@b.com", expiresAt: new Date() };
  const { cookies } = await import("next/headers");
  vi.mocked(cookies).mockResolvedValueOnce({
    get: vi.fn().mockReturnValue({ value: "valid-token" }),
  } as any);

  const { jwtVerify } = await import("jose");
  vi.mocked(jwtVerify).mockResolvedValueOnce({ payload } as any);

  const { getSession } = await import("@/lib/auth");
  const result = await getSession();

  expect(result).toEqual(payload);
});

test("getSession returns null when jwtVerify throws", async () => {
  const { cookies } = await import("next/headers");
  vi.mocked(cookies).mockResolvedValueOnce({
    get: vi.fn().mockReturnValue({ value: "bad-token" }),
  } as any);

  const { jwtVerify } = await import("jose");
  vi.mocked(jwtVerify).mockRejectedValueOnce(new Error("invalid signature"));

  const { getSession } = await import("@/lib/auth");
  const result = await getSession();

  expect(result).toBeNull();
});

// --- deleteSession ---

test("deleteSession removes the auth-token cookie", async () => {
  const mockDelete = vi.fn();
  const { cookies } = await import("next/headers");
  vi.mocked(cookies).mockResolvedValueOnce({ delete: mockDelete } as any);

  const { deleteSession } = await import("@/lib/auth");
  await deleteSession();

  expect(mockDelete).toHaveBeenCalledWith("auth-token");
});

// --- verifySession ---

test("verifySession returns null when request has no auth-token cookie", async () => {
  const { NextRequest } = await import("next/server");
  const request = new NextRequest("http://localhost/");

  const { verifySession } = await import("@/lib/auth");
  const result = await verifySession(request);

  expect(result).toBeNull();
});

test("verifySession returns the decoded payload for a valid token in the request", async () => {
  const payload = { userId: "u-99", email: "x@y.com", expiresAt: new Date() };
  const { jwtVerify } = await import("jose");
  vi.mocked(jwtVerify).mockResolvedValueOnce({ payload } as any);

  const { NextRequest } = await import("next/server");
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: "auth-token=some-valid-token" },
  });

  const { verifySession } = await import("@/lib/auth");
  const result = await verifySession(request);

  expect(result).toEqual(payload);
});

test("verifySession returns null when jwtVerify throws for a request token", async () => {
  const { jwtVerify } = await import("jose");
  vi.mocked(jwtVerify).mockRejectedValueOnce(new Error("expired"));

  const { NextRequest } = await import("next/server");
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: "auth-token=expired-token" },
  });

  const { verifySession } = await import("@/lib/auth");
  const result = await verifySession(request);

  expect(result).toBeNull();
});
