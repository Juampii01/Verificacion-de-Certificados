// POST /api/certificate-requests -> pública, el graduado pide su certificado
// GET  /api/certificate-requests -> admin, lista las solicitudes pendientes
import { NextResponse } from "next/server";
import { checkAdmin } from "../../../lib/auth.js";
import { submitCertificateRequest, listPendingRequests, MAX_NAME_LENGTH } from "../../../lib/certificateRequests.js";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { first_name, last_name, full_name, email } = body;

  if (full_name && String(full_name).length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres` }, { status: 400 });
  }

  const result = await submitCertificateRequest({ first_name, last_name, full_name, email });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result, { status: 200 });
}

export async function GET(request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const result = await listPendingRequests();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ requests: result.requests }, { status: 200 });
}
