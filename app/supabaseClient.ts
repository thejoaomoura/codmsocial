// src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://jyxolnhijmdwxkfkffax.storage.supabase.co", // seu endpoint
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // chave anon do Supabase
);
