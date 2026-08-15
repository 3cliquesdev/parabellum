import type { AdminClient } from "@/lib/auth/guard";

export async function consumeApiRateLimit(
  admin: AdminClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc("consume_api_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("Rate limit unavailable:", error.message);
    return false;
  }
  return data === true;
}
