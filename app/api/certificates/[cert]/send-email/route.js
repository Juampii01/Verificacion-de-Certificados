// POST /api/certificates/[cert]/send-email -> pública, sin token.
// Genera el PDF y lo manda por email a la dirección REGISTRADA del certificado.
// No hay descarga directa: el número de certificado es público por diseño (para
// verificar), así que la única forma de obtener el PDF es que llegue al email
// que quedó cargado en el registro, no a cualquiera que visite la página.
import { NextResponse } from "next/server";
import { publicClient } from "../../../../../lib/supabase.js";
import { certificatePdf } from "../../../../../lib/pdf.js";
import { sendCertificatePdfEmail } from "../../../../../lib/email.js";

export const runtime = "nodejs";

export async function POST(_request, { params }) {
  const number = decodeURIComponent(params.cert).toUpperCase();
  const supabase = publicClient();
  const { data: cert, error } = await supabase
    .from("certificates").select("*").eq("certificate_number", number).single();

  if (error || !cert) {
    return NextResponse.json({ error: "Certificado no encontrado" }, { status: 404 });
  }
  if (!cert.email) {
    return NextResponse.json(
      { error: "Este certificado no tiene un email registrado. Escribí a team@govbidder.net para que te ayudemos." },
      { status: 400 }
    );
  }

  const pdfBytes = await certificatePdf(cert);
  try {
    await sendCertificatePdfEmail(cert.email, {
      full_name: cert.full_name || `${cert.first_name || ""} ${cert.last_name || ""}`.trim(),
      certificate_number: cert.certificate_number,
      pdfBytes,
    });
  } catch (e) {
    return NextResponse.json({ error: "No se pudo enviar el email: " + e.message }, { status: 500 });
  }

  const maskedEmail = cert.email.replace(/^(.{2}).*(@.*)$/, "$1***$2");
  return NextResponse.json({ sent: true, email: maskedEmail }, { status: 200 });
}
