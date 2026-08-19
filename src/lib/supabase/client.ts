import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // Guard against SSR / prerender when env vars may not exist
  if (typeof window === "undefined") {
    throw new Error(
      "createClient() should only be called in the browser. Use @/lib/supabase/server on the server.",
    );
  }
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );

  return client;
}
