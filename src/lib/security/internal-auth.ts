import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function getInternalApiSecret(): string | null {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

export function isInternalRequest(request: NextRequest): boolean {
  const expected = getInternalApiSecret();
  const provided = request.headers.get("x-internal-key");
  return Boolean(expected && provided && safeEqual(provided, expected));
}
