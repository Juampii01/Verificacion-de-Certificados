// GET /api/certificates/[cert]/pdf  -> descarga el PDF del certificado (SOLO ADMIN)
// El público no puede descargar el PDF directo con solo el número: el número de
// certificado es público por diseño (para verificar), así que permitir la descarga
// acá dejaría que cualquiera con un número ajeno se baje el PDF de otra persona.
// El público recibe el PDF por email en la dirección registrada (ver send-email/route.js).
import { publicClient } from "../../../../../lib/supabase.js";
import { certificatePdf } from "../../../../../lib/pdf.js";
import { checkAdmin } from "../../../../../lib/auth.js";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  if (!checkAdmin(request)) {
    return new Response("No autorizado", { status: 401 });
  }
  const number = decodeURIComponent(params.cert).toUpperCase();
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("certificate_number", number)
    .single();

  if (error || !data) {
    return new Response("Certificado no encontrado", { status: 404 });
  }

  const bytes = await certificatePdf(data);
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${number}.pdf"`,
    },
  });
}
