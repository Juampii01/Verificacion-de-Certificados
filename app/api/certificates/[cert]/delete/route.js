// POST /api/certificates/[cert]/delete -> elimina un certificado (SOLO ADMIN).
// Su número global queda libre y lo toma el próximo certificado que se cree
// (ver huecos en lib/createCertificates.js).
import { NextResponse } from "next/server";
import { adminClient } from "../../../../../lib/supabase.js";
import { checkAdmin } from "../../../../../lib/auth.js";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const number = decodeURIComponent((await params).cert).toUpperCase();
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("certificates")
    .delete()
    .eq("certificate_number", number)
    .select("certificate_number, seq");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || !data.length) return NextResponse.json({ error: "Certificado no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true, deleted: data[0].certificate_number, freedSeq: data[0].seq });
}
