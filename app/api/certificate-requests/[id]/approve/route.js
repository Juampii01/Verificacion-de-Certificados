// POST /api/certificate-requests/[id]/approve -> admin aprueba una solicitud pendiente
import { NextResponse } from "next/server";
import { checkAdmin } from "../../../../../lib/auth.js";
import { approveCertificateRequest } from "../../../../../lib/certificateRequests.js";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const result = await approveCertificateRequest(params.id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result, { status: 200 });
}
