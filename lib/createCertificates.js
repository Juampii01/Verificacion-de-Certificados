// lib/createCertificates.js
// Lógica compartida por el alta individual y la carga masiva.
// Recibe filas "crudas", asigna número GBC (si no viene) e inserta en Supabase.
import { adminClient } from "./supabase.js";
import { buildCertificateNumber, isValidCertNumber } from "./certNumber.js";

// Normaliza una fila venida del formulario o del XLS a las columnas de la tabla.
function normalizeRow(r) {
  const get = (...keys) => {
    for (const k of keys) {
      for (const actual of Object.keys(r)) {
        if (actual.trim().toLowerCase() === k.toLowerCase() && r[actual] != null && r[actual] !== "") {
          return String(r[actual]).trim();
        }
      }
    }
    return "";
  };
  const first = get("first_name", "nombre", "name");
  const last = get("last_name", "apellido", "surname");
  return {
    first_name: first,
    last_name: last,
    full_name: get("full_name", "nombre completo") || `${first} ${last}`.trim(),
    email: get("email", "correo", "mail"),
    program: get("program", "programa") || "GovBidder Challenge",
    certificate_type: get("certificate_type", "tipo") || "Certificate of Completion",
    issue_date: get("issue_date", "fecha", "fecha de emision", "fecha de emisión") || null,
    hours: parseInt(get("hours", "horas"), 10) || null,
    issued_by: get("issued_by", "emitido por") || "GovBidder",
    signed_by: get("signed_by", "firmado por") || "",
    status: (get("status", "estado") || "active").toLowerCase(),
    certificate_number: get("certificate_number", "numero", "número", "numero de certificado", "número de certificado"),
  };
}

// Inicio de la edición actual del Challenge (igual que EDITIONS en app/admin/page.jsx).
// Solo se reusan números dentro de esta edición, para no tocar la numeración vieja.
const CURRENT_EDITION_FROM = "2026-11-01";

// Números globales libres de la edición actual: huecos entre el menor y el mayor
// número usado (por ejemplo, el de un certificado eliminado). De menor a mayor.
async function freeSeqs(supabase, limit) {
  const used = new Set();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("certificates")
      .select("seq")
      .not("seq", "is", null)
      .gte("issue_date", CURRENT_EDITION_FROM)
      .range(from, from + pageSize - 1);
    if (error) return [];
    for (const r of data || []) used.add(Number(r.seq));
    if (!data || data.length < pageSize) break;
  }
  if (!used.size) return [];
  const min = Math.min(...used);
  const max = Math.max(...used);
  const out = [];
  for (let n = min + 1; n < max && out.length < limit; n++) if (!used.has(n)) out.push(n);
  return out;
}

// Crea uno o varios certificados. Devuelve { created: [...], errors: [...] }.
export async function createCertificates(rawRows) {
  const supabase = adminClient();
  const rows = rawRows.map(normalizeRow);

  // Validaciones básicas por fila.
  const errors = [];
  rows.forEach((row, i) => {
    if (!row.last_name) errors.push({ fila: i + 1, error: "Falta el apellido" });
    if (!["active", "revoked", "pending"].includes(row.status)) {
      row.status = "active";
    }
    if (row.certificate_number && !isValidCertNumber(row.certificate_number)) {
      errors.push({ fila: i + 1, error: `Número inválido: ${row.certificate_number}` });
    }
  });
  if (errors.length) return { created: [], errors };

  // Cuántos números hay que generar (los que no traen certificate_number).
  const needNumber = rows.filter((r) => !r.certificate_number).length;
  let seqs = [];
  if (needNumber > 0) {
    // 1) Primero se reusan los números libres (huecos que dejó un certificado eliminado).
    seqs = await freeSeqs(supabase, needNumber);
    // 2) El resto sale de la secuencia global.
    const rest = needNumber - seqs.length;
    if (rest > 0) {
      const { data, error } = await supabase.rpc("next_cert_seqs", { n: rest });
      if (error) return { created: [], errors: [{ error: "No se pudo obtener la secuencia: " + error.message }] };
      seqs = seqs.concat((data || []).map((x) => (typeof x === "object" ? Object.values(x)[0] : x)));
    }
  }

  // Asignar número a cada fila.
  let si = 0;
  const toInsert = rows.map((row) => {
    let number = row.certificate_number;
    let seq = null;
    if (!number) {
      seq = seqs[si++];
      number = buildCertificateNumber({
        lastName: row.last_name,
        sequence: seq,
        issueDate: row.issue_date,
      });
    }
    return {
      certificate_number: number.toUpperCase(),
      first_name: row.first_name || null,
      last_name: row.last_name || null,
      full_name: row.full_name || null,
      email: row.email || null,
      program: row.program,
      certificate_type: row.certificate_type,
      issue_date: row.issue_date || null,
      hours: row.hours,
      issued_by: row.issued_by,
      signed_by: row.signed_by || null,
      status: row.status,
      seq,
    };
  });

  const { data, error } = await supabase
    .from("certificates")
    .insert(toInsert)
    .select();

  if (error) {
    return { created: [], errors: [{ error: error.message }] };
  }
  return { created: data, errors: [] };
}
