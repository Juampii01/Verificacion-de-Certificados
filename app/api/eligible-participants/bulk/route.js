// POST /api/eligible-participants/bulk -> carga la lista de "día 4" (Excel/CSV)
// Mismo patrón de lectura que /api/certificates/bulk. Upsert por email.
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { checkAdmin } from "../../../../lib/auth.js";
import { adminClient } from "../../../../lib/supabase.js";

export const runtime = "nodejs";

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
  const email = get("email", "correo", "mail").toLowerCase();
  return {
    email,
    first_name: first || null,
    last_name: last || null,
    full_name: get("full_name", "nombre completo") || `${first} ${last}`.trim() || null,
    program: get("program", "programa") || "GovBidder Challenge",
  };
}

export async function POST(request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!file) {
    return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const name = (file.name || "").toLowerCase();
  let rows;
  try {
    const wb = name.endsWith(".csv")
      ? XLSX.read(buf.toString("utf8"), { type: "string" })
      : XLSX.read(buf, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  } catch (e) {
    return NextResponse.json({ error: "No se pudo leer el archivo: " + e.message }, { status: 400 });
  }

  if (!rows.length) {
    return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
  }

  const normalized = rows.map(normalizeRow);
  const errors = [];
  normalized.forEach((row, i) => {
    if (!row.email || !row.email.includes("@")) errors.push({ fila: i + 1, error: "Email inválido o faltante" });
  });
  if (errors.length) {
    return NextResponse.json({ total: rows.length, importados: 0, errores: errors }, { status: 400 });
  }

  const supabase = adminClient();
  const { data, error } = await supabase
    .from("eligible_participants")
    .upsert(normalized, { onConflict: "email" })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ total: rows.length, importados: data.length }, { status: 200 });
}
