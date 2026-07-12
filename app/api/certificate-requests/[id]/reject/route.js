// POST /api/certificate-requests/[id]/reject -> admin rechaza una solicitud pendiente
import { NextResponse } from "next/server";
import { checkAdmin } from "../../../../../lib/auth.js";
import { rejectCertificateRequest } from "../../../../../lib/certificateRequests.js";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const result = await rejectCertificateRequest(params.id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result, { status: 200 });
}
