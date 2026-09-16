import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"];
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"];

// O Lovable pode renderizar a aplicação antes de injetar as variáveis públicas.
// Não derrube a landing page nesse caso; chamadas autenticadas continuarão
// falhando de forma controlada até que as variáveis sejam configuradas.
const configuredSupabaseUrl = supabaseUrl || "https://placeholder.supabase.co";
const configuredSupabaseAnonKey = supabaseAnonKey || "missing-anon-key";

export const supabase = createClient(
  configuredSupabaseUrl,
  configuredSupabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
