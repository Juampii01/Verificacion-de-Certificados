// lib/supabase.js
// Dos clientes distintos según el contexto:
//   - browser: clave anon (pública), solo lectura vía RLS.
//   - admin:   clave service_role (secreta), solo en el servidor, salta RLS.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Cliente público (lectura para la página de verificación).
export function publicClient() {
  return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Cliente de servidor (escrituras del panel admin). NUNCA usar en el navegador.
export function adminClient() {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
