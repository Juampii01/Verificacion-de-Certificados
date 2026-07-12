// GET /api/certificates/[cert]/pdf  -> descarga el PDF del certificado
import { publicClient } from "../../../../../lib/supabase.js";
import { certificatePdf } from "../../../../../lib/pdf.js";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
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
