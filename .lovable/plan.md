

# Fix: RPC `get_inbox_time_report` -- type mismatch errors

## Root Cause

The `department` column on `conversations` is `uuid` (not text). The RPC has multiple type mismatches:
- `d.id::text = c.department` → `text = uuid` (fails)
- `c.department = p_department_id::text` → `uuid = text` (fails)
- `c.channel::text` and `c.status::text` casts are unnecessary noise but may work since they're USER-DEFINED enums

## Fix (1 migration)

**DROP and recreate** `get_inbox_time_report` with corrected types:

1. `LEFT JOIN departments d ON d.id = c.department` (remove `::text` cast)
2. `c.department = p_department_id` (remove `::text` cast, both are uuid)
3. Keep `c.channel::text` and `c.status::text` since those are enum→text comparisons with text params (valid)
4. Output columns `ch` and `st` already cast to text (fine)

This single migration fix will make the RPC functional, enabling both the data table/KPIs and the Excel export.

## Files

| File | Action |
|---|---|
| Migration SQL | `CREATE OR REPLACE FUNCTION` with fixed joins/filters |

No frontend changes needed — the hook and page code are correct.

