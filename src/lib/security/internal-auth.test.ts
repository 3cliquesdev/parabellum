import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  getInternalApiSecret,
  isInternalRequest,
} from "./internal-auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("internal request authentication", () => {
  it("recusa segredo curto ou ausente", () => {
    vi.stubEnv("INTERNAL_API_SECRET", "curto");
    expect(getInternalApiSecret()).toBeNull();
  });

  it("aceita apenas o segredo interno dedicado", () => {
    const secret = "a".repeat(32);
    vi.stubEnv("INTERNAL_API_SECRET", secret);
    const valid = new NextRequest("https://example.com/api/worker", {
      headers: { "x-internal-key": secret },
    });
    const invalid = new NextRequest("https://example.com/api/worker", {
      headers: { "x-internal-key": "b".repeat(32) },
    });

    expect(isInternalRequest(valid)).toBe(true);
    expect(isInternalRequest(invalid)).toBe(false);
  });
});
