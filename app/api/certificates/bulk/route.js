// POST /api/certificates/bulk  -> carga masiva desde Excel/CSV
// Recibe un archivo (multipart/form-data, campo "file").
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { checkAdmin } from "../../../../lib/auth.js";
import { createCertificates } from "../../../../lib/createCertificates.js";

export const runtime = "nodejs";

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
    // CSV: decodificar como UTF-8 para no romper acentos (González, León...).
    // XLSX real: leer como buffer (ya guarda UTF-8 internamente).
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

  const result = await createCertificates(rows);
  return NextResponse.json({
    total: rows.length,
    creados: result.created.length,
    errores: result.errors,
    created: result.created,
  }, { status: result.errors.length && !result.created.length ? 400 : 200 });
}
