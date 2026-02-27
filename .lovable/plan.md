

# Fix: Auto-close cron running every HOUR instead of every 10 minutes

## Root Cause

The cron job `auto-close-inactive-conversations` in the database has schedule `0 * * * *` (once per hour, at minute 0). This is why conversations stay open for 40+ minutes — the cron only runs at :00 of each hour.

The `config.toml` says `*/10 * * * *` but the actual database cron was never updated to match.

**Evidence from logs:** Job runs at 09:00, 10:00, 11:00, 12:00, 13:00 — exactly hourly.

## Fix (1 migration)

Update the cron schedule from `0 * * * *` to `*/10 * * * *`:

```sql
SELECT cron.alter_job(
  job_id := 4,
  schedule := '*/10 * * * *'
);
```

This single change will make the auto-close check run every 10 minutes, meaning conversations will be closed within ~15 minutes of inactivity threshold (configured time + up to 10 min cron delay).

## Files

| File | Action |
|---|---|
| Migration SQL | Update cron schedule to `*/10 * * * *` |

No frontend or edge function changes needed — the auto-close logic itself is working correctly (logs confirm it closes conversations when it runs).

