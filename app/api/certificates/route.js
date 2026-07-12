// POST /api/certificates  -> crea UN certificado (alta individual)
import { NextResponse } from "next/server";
import { checkAdmin } from "../../../lib/auth.js";
import { createCertificates } from "../../../lib/createCertificates.js";

export const runtime = "nodejs";

export async function POST(request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const result = await createCertificates([body]);
  if (result.errors.length) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }
  return NextResponse.json({ created: result.created });
}
