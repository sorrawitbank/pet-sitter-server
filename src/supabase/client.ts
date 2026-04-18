import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  console.error("SUPABASE_URL is not set in environment variables");
  throw new Error("SUPABASE_URL is required");
}

if (!process.env.SUPABASE_ANON_KEY) {
  console.error("SUPABASE_ANON_KEY is not set in environment variables");
  throw new Error("SUPABASE_ANON_KEY is required");
}

const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export default supabaseClient;
