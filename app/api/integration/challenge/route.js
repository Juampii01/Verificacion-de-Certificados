// POST /api/integration/challenge
// Integración con la app del Challenge (dboard.govbidder.net). Solo servidor a
// servidor, autenticado con el header x-integration-secret (CHALLENGE_INTEGRATION_SECRET).
//
// action "issue": emite el certificado del participante (o devuelve el que ya tiene
//   con ese email y esa fecha de finalización, para no duplicar) y devuelve el PDF.
// action "pdf": devuelve el PDF de un certificado ya emitido, verificando que el
//   email coincida con el registrado.
//
// El Challenge ya valida que la persona completó el Día 4 antes de llamar acá.
import { NextResponse } from "next/server";
import { adminClient } from "../../../../lib/supabase.js";
import { createCertificates } from "../../../../lib/createCertificates.js";
import { certificatePdf, certificateFilename, verifyUrl } from "../../../../lib/pdf.js";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 45;

function authorized(request) {
  const expected = process.env.CHALLENGE_INTEGRATION_SECRET;
  return !!expected && request.headers.get("x-integration-secret") === expected;
}

async function pdfResponse(cert) {
  const bytes = await certificatePdf(cert);
  return NextResponse.json({
    ok: true,
    certificate_number: cert.certificate_number,
    full_name: cert.full_name,
    issue_date: cert.issue_date,
    verify_url: verifyUrl(cert.certificate_number),
    filename: certificateFilename(cert),
    pdf_base64: Buffer.from(bytes).toString("base64"),
  });
}

export async function POST(request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!email.includes("@")) return NextResponse.json({ error: "bad_email" }, { status: 400 });
  const supabase = adminClient();

  if (body.action === "pdf") {
    const number = String(body.certificate_number || "").trim().toUpperCase();
    const { data } = await supabase.from("certificates").select("*").eq("certificate_number", number).maybeSingle();
    if (!data || String(data.email || "").toLowerCase() !== email) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return pdfResponse(data);
  }

  if (body.action !== "issue") return NextResponse.json({ error: "bad_action" }, { status: 400 });

  const first = String(body.first_name || "").trim();
  const last = String(body.last_name || "").trim();
  const full = String(body.full_name || `${first} ${last}`).trim().slice(0, MAX_NAME_LENGTH);
  const issueDate = String(body.issue_date || "").trim();
  if (!last) return NextResponse.json({ error: "missing_last_name" }, { status: 400 });
  if (!full) return NextResponse.json({ error: "missing_name" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) return NextResponse.json({ error: "bad_date" }, { status: 400 });

  // Idempotente: si ya tiene un certificado activo de esta edición, se devuelve ese.
  const { data: existing } = await supabase
    .from("certificates").select("*")
    .eq("email", email).eq("issue_date", issueDate).eq("status", "active")
    .order("created_at", { ascending: true }).limit(1);
  if (existing && existing.length) return pdfResponse(existing[0]);

  const result = await createCertificates([{
    first_name: first, last_name: last, full_name: full, email,
    issue_date: issueDate, hours: 16, signed_by: "Santo González",
  }]);
  if (result.errors.length) {
    return NextResponse.json({ error: "create_failed", message: result.errors.map((e) => e.error).join("; ") }, { status: 500 });
  }
  return pdfResponse(result.created[0]);
}
