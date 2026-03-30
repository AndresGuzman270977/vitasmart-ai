import { createBrowserClient } from "@supabase/ssr";

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!rawSupabaseUrl || !rawSupabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabaseUrl: string = rawSupabaseUrl;
const supabaseAnonKey: string = rawSupabaseAnonKey;

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        "X-Client-Info": "vita-smart-ai-web",
      },
    },
  });

  return supabaseInstance;
}

export const supabase = getSupabaseClient();