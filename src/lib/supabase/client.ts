import { createBrowserClient } from "@supabase/ssr";
import type { LooseDatabase } from "@/types/database";

export function createClient() {
  return createBrowserClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
