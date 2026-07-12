// GET /api/certificates/[cert]/qr  -> descarga el QR (PNG) del certificado
import { qrPng } from "../../../../../lib/pdf.js";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const number = decodeURIComponent(params.cert).toUpperCase();
  const png = await qrPng(number, 600);
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="QR-${number}.png"`,
    },
  });
}
