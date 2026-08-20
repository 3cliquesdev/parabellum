import Redis from "ioredis";

let client: Redis | null | undefined;

// Cache best-effort: se REDIS_URL nao estiver configurada ou a conexao falhar,
// tudo aqui deve degradar pra "sempre buscar do Supabase" - nunca travar uma
// rota por causa do Redis.
function getRedisClient(): Redis | null {
  if (client !== undefined) return client;

  const url = process.env.REDIS_URL;
  if (!url) {
    client = null;
    return client;
  }

  client = new Redis(url, { maxRetriesPerRequest: 1, retryStrategy: () => null });
  client.on("error", () => {});
  return client;
}

/**
 * Cache-aside com fallback silencioso: tenta o Redis, mas qualquer falha
 * (conexao caida, timeout) cai direto pro loader (Supabase) sem quebrar a
 * rota. Usar so para dados que toleram alguns minutos de atraso (config de
 * tenant, SLA, horario comercial) - nunca para dado transacional.
 */
export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const redis = getRedisClient();
  if (!redis) return loader();

  try {
    const hit = await redis.get(key);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch {
    // Redis indisponivel - segue pro Supabase normalmente.
  }

  const value = await loader();

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Falha ao gravar no cache nao deve impedir a resposta.
  }

  return value;
}

export async function invalidateCache(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // Best-effort - se falhar, o TTL cuida de expirar o valor velho.
  }
}
