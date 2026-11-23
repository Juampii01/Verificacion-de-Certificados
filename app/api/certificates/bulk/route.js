// POST /api/certificates/bulk  -> carga masiva desde Excel/CSV
// Recibe un archivo (multipart/form-data, campo "file").
import { NextResponse } from "next/server";
import { readSpreadsheetRows } from "../../../../lib/spreadsheet.js";
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
  let rows;
  try {
    rows = await readSpreadsheetRows(buf, file.name);
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
