

# Fix: OTP Pre-Check Bugs — Scoping + Email Fallback

## Root Cause Analysis

The pre-check implementation has two bugs that explain why it keeps asking for email:

### Bug 1: Variable Scoping (Zones 2, 3, 4)
Lines 2599, 2796, and 3825 use `supabaseUrl` and `supabaseKey` — but these are `const` variables declared inside the `validate_customer` handler block (L3681) or the OTP state machine handler (L1682). They are NOT in scope in the OTP initialization handlers at zones 2, 3, and 4. If `customer_validated === true`, the code enters the pre-check block and crashes with `ReferenceError` at the `fetch()` call.

### Bug 2: Empty Email (all zones)
When the customer was validated by phone (kiwify-phone), the API response may not include an email. So `customer_email_found = ""` (falsy). The pre-check condition `collectedData.customer_email_found` evaluates to false, and the code falls through to the `ask_email` fallback. The contact's email exists in the database (`activeContactData.email`) but is never checked.

## Fix

### 1. Replace scoped variables with direct `Deno.env.get()` calls
In zones 2, 3, and 4, replace `supabaseUrl` and `supabaseKey` with inline `Deno.env.get('SUPABASE_URL')` and `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` — same pattern Zone 5 (L5104) already uses correctly.

### 2. Add email fallback from contact data
In all 5 pre-check zones, when `customer_email_found` is empty, try `activeContactData?.email` (or the equivalent contact data variable for each zone). Update the condition:

```text
const preEmail = collectedData.customer_email_found || activeContactData?.email;
if (collectedData.customer_validated === true && preEmail) {
  // send OTP to preEmail...
```

### Zones affected

| Zone | Line | Scope Bug | Email Bug | Fix |
|------|------|-----------|-----------|-----|
| 1 (Manual) | L1373 | No (uses `Deno.env.get`) | Yes | Add email fallback |
| 2 (Generic) | L2589 | Yes (`supabaseUrl`) | Yes | Fix scope + email fallback |
| 3 (Auto-advance) | L2788 | Yes (`supabaseUrl`) | Yes | Fix scope + email fallback |
| 4 (Post-traverse) | L3817 | Yes (`supabaseUrl`) | Yes | Fix scope + email fallback |
| 5 (Master) | L5099 | No (uses `Deno.env.get`) | Yes | Add email fallback |

### File changed
`supabase/functions/process-chat-flow/index.ts` — 5 zones, ~2 lines each

