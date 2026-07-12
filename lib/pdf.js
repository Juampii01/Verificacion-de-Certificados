// lib/pdf.js
// Genera el QR y el PDF del certificado con el QR embebido.
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

// URL de verificación a la que apunta el QR.
export function verifyUrl(certificateNumber) {
  const base = (process.env.VERIFY_BASE_URL || "https://verify.govbidder.net").replace(/\/$/, "");
  return `${base}/certificate/${encodeURIComponent(certificateNumber)}`;
}

// QR como PNG (Buffer). Sirve para descargar o para pegar en Canva.
export async function qrPng(certificateNumber, size = 600) {
  const url = verifyUrl(certificateNumber);
  return QRCode.toBuffer(url, { width: size, margin: 1, errorCorrectionLevel: "M" });
}

// Colores de marca
const NAVY = rgb(0.05, 0.12, 0.24);
const GOLD = rgb(0.72, 0.55, 0.18);
const GREY = rgb(0.35, 0.38, 0.42);

// Genera el PDF del certificado. Devuelve un Uint8Array.
// Si existe public/plantilla.png la usa de fondo (diseño de Canva exportado);
// si no, dibuja un certificado limpio desde cero.
export async function certificatePdf(cert) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // A4 horizontal (pt)
  const { width, height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Fondo opcional desde plantilla de Canva
  const bgPath = path.join(process.cwd(), "public", "plantilla.png");
  let hasBg = false;
  if (fs.existsSync(bgPath)) {
    try {
      const bg = await pdf.embedPng(fs.readFileSync(bgPath));
      page.drawImage(bg, { x: 0, y: 0, width, height });
      hasBg = true;
    } catch (_) {}
  }

  if (!hasBg) {
    // Marco simple
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: GOLD, borderWidth: 2 });
    page.drawText("GOVBIDDER ACADEMY", { x: 60, y: height - 80, size: 16, font: bold, color: NAVY });
    page.drawText("CERTIFICATE OF COMPLETION", { x: 60, y: height - 110, size: 26, font: bold, color: NAVY });
    page.drawText("Awarded to", { x: 60, y: height - 180, size: 12, font, color: GREY });
    page.drawText(cert.full_name || `${cert.first_name || ""} ${cert.last_name || ""}`.trim(), {
      x: 60, y: height - 215, size: 30, font: bold, color: NAVY,
    });

    const lines = [
      ["Program", cert.program || "GovBidder Challenge"],
      ["Completed on", fmtDate(cert.issue_date)],
      ["Hours completed", cert.hours ? `${cert.hours} hours` : "-"],
      ["Signed by", cert.signed_by || "-"],
    ];
    let y = height - 300;
    for (const [label, val] of lines) {
      page.drawText(label.toUpperCase(), { x: 60, y, size: 9, font: bold, color: GREY });
      page.drawText(String(val), { x: 60, y: y - 18, size: 14, font, color: NAVY });
      y -= 55;
    }
    page.drawText("CERTIFICATE NO.", { x: 60, y: 70, size: 9, font: bold, color: GREY });
    page.drawText(cert.certificate_number, { x: 60, y: 50, size: 16, font: bold, color: NAVY });
  }

  // QR (arriba a la derecha)
  const qrBuf = await qrPng(cert.certificate_number, 400);
  const qrImg = await pdf.embedPng(qrBuf);
  const qrSize = 120;
  page.drawImage(qrImg, { x: width - qrSize - 60, y: 60, width: qrSize, height: qrSize });
  page.drawText("Escaneá para verificar", {
    x: width - qrSize - 60, y: 45, size: 8, font, color: GREY,
  });

  return pdf.save();
}

function fmtDate(d) {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
  } catch (_) {
    return String(d);
  }
}
