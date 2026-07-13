// GET  /api/certificates/sync-emails -> propone matches por nombre (no escribe nada)
// POST /api/certificates/sync-emails -> aplica el backfill de los pares confirmados
import { NextResponse } from "next/server";
import { checkAdmin } from "../../../../lib/auth.js";
import { proposeEmailMatches, applyEmailMatches } from "../../../../lib/syncEmails.js";

export const runtime = "nodejs";

export async function GET(request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const result = await proposeEmailMatches();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}

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
  const pairs = Array.isArray(body.pairs) ? body.pairs : [];
  if (!pairs.length) {
    return NextResponse.json({ error: "Nada para aplicar" }, { status: 400 });
  }
  const result = await applyEmailMatches(pairs);
  return NextResponse.json(result);
}
