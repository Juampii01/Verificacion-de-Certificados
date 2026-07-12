// GET /api/certificates/export  -> CSV listo para Canva Bulk Create
// Columnas mapeables a los campos del diseño + la URL del QR de cada certificado.
import { publicClient } from "../../../../lib/supabase.js";
import { checkAdmin } from "../../../../lib/auth.js";

export const runtime = "nodejs";

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
function fechaLarga(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return `${dt.getUTCDate()} de ${MESES[dt.getUTCMonth()]} de ${dt.getUTCFullYear()}`;
}
const ESTADO = { active: "Activo y válido", revoked: "Revocado", pending: "Pendiente" };

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request) {
  if (!checkAdmin(request)) {
    return new Response("No autorizado", { status: 401 });
  }
  const base = (process.env.VERIFY_BASE_URL || "https://verify.govbidder.net").replace(/\/$/, "");
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .order("seq", { ascending: true });

  if (error) return new Response("Error: " + error.message, { status: 500 });

  const headers = ["Nombre Completo", "Número de certificado", "Fecha de finalización", "Estado", "QR"];
  const lines = [headers.join(",")];
  for (const c of data || []) {
    const qrUrl = `${base}/api/certificates/${encodeURIComponent(c.certificate_number)}/qr`;
    lines.push([
      csvCell(c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim()),
      csvCell(c.certificate_number),
      csvCell(fechaLarga(c.issue_date)),
      csvCell(ESTADO[c.status] || c.status),
      csvCell(qrUrl),
    ].join(","));
  }
  // BOM para que Excel/Canva respeten los acentos
  const csv = "﻿" + lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="canva-bulk-create.csv"',
    },
  });
}
