import PgBoss from "pg-boss";

let boss: PgBoss | null = null;

export async function getQueue(): Promise<PgBoss> {
  if (boss) return boss;

  boss = new PgBoss({
    connectionString: process.env.SUPABASE_DB_PASSWORD!,
    schema: "pgboss",
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    expireInHours: 24,
    archiveCompletedAfterSeconds: 60 * 60 * 24 * 7,
  });

  await boss.start();
  return boss;
}

export const QUEUES = {
  BROADCAST_PROCESS_CAMPAIGN: "broadcast.process-campaign",
} as const;
