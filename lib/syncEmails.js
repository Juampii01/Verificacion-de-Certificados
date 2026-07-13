// lib/syncEmails.js
// Backfillea el email de certificados que no lo tienen, cruzando por nombre
// normalizado contra la lista de elegibles (día 4), que sí trae email.
// Solo cuenta como match un nombre exactamente igual una vez normalizado
// (sin tildes, minúsculas, sin puntuación) — si dos elegibles normalizan al
// mismo nombre, se descarta el cruce para no asignar el email de otra
// persona por error. Es de solo-lectura hasta que se llama applyEmailMatches.
import { adminClient } from "./supabase.js";

// Rango Unicode de marcas diacríticas combinantes (U+0300-U+036F), construido
// desde los códigos de punto para no depender de tipear el carácter literal.
const DIACRITICS_RE = new RegExp(`[\\u${(0x0300).toString(16).padStart(4, "0")}-\\u${(0x036f).toString(16).padStart(4, "0")}]`, "g");

function normalizeName(s) {
  return String(s || "")
    .normalize("NFD").replace(DIACRITICS_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function certName(c) {
  return c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim();
}

function eligibleName(e) {
  return e.full_name || `${e.first_name || ""} ${e.last_name || ""}`.trim();
}

export async function proposeEmailMatches() {
  const supabase = adminClient();
  const [{ data: certs, error: certsErr }, { data: eligibles, error: eligErr }] = await Promise.all([
    supabase.from("certificates").select("certificate_number, first_name, last_name, full_name, email").is("email", null),
    supabase.from("eligible_participants").select("email, first_name, last_name, full_name"),
  ]);
  if (certsErr) return { error: certsErr.message };
  if (eligErr) return { error: eligErr.message };

  const byName = new Map();
  for (const e of eligibles) {
    const key = normalizeName(eligibleName(e));
    if (!key) continue;
    byName.set(key, byName.has(key) ? null : e);
  }

  const matches = [];
  const unmatched = [];
  for (const c of certs) {
    const key = normalizeName(certName(c));
    const hit = key ? byName.get(key) : null;
    if (hit) {
      matches.push({
        certificate_number: c.certificate_number,
        cert_name: certName(c),
        matched_email: hit.email,
        matched_name: eligibleName(hit),
      });
    } else {
      unmatched.push({ certificate_number: c.certificate_number, cert_name: certName(c) });
    }
  }
  return { matches, unmatched };
}

// Aplica el backfill: escribe el email solo en certificados que confirman no
// tener uno todavía (por si alguien lo cargó a mano mientras tanto).
export async function applyEmailMatches(pairs) {
  const supabase = adminClient();
  let updated = 0;
  const errors = [];
  for (const { certificate_number, email } of pairs) {
    const { error, count } = await supabase
      .from("certificates")
      .update({ email })
      .eq("certificate_number", certificate_number)
      .is("email", null)
      .select("certificate_number", { count: "exact" });
    if (error) errors.push({ certificate_number, error: error.message });
    else updated += count || 0;
  }
  return { updated, errors };
}
