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

// Nombre de archivo para el PDF descargado: nombre y apellido de la persona,
// no el número de certificado (que no le dice nada al dueño del archivo).
export function certificateFilename(cert) {
  const clean = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, "").trim();
  const name = clean(cert.full_name || `${cert.first_name || ""} ${cert.last_name || ""}`.trim()) || cert.certificate_number;
  const program = clean(cert.program || "GovBidder Challenge");
  return `${name} - ${program} - Certificado.pdf`;
}

// Colores de marca
const NAVY = rgb(0.05, 0.12, 0.24);
const GOLD = rgb(0.72, 0.55, 0.18);
const GREY = rgb(0.35, 0.38, 0.42);

// Tamaño real del diseño exportado de Canva (plantilla-blank.pdf): 842.25 x 595.5 pt.
const PAGE_W = 842.25;
const PAGE_H = 595.5;

// Coordenadas calibradas a mano contra el texto de plantilla-blank.pdf
// (extraídas con PyMuPDF, convertidas de coordenadas top-down a bottom-up de pdf-lib).
const LAYOUT = {
  // Hueco entre "...reconoce que" (termina en y=262.7) y "ha completado..." (empieza en y=335.5).
  // Centrado en PAGE_W/2: es el mismo eje que usa el resto del texto de la plantilla
  // ("Este certificado reconoce que", "GovBidder Challenge", etc. están centrados ahí).
  // Antes se corría el centro hacia la derecha para no pisar el QR con nombres largos,
  // pero eso desalineaba el nombre del resto del texto centrado — mejor centrar siempre
  // igual y confiar en el achicado de fuente (maxNameWidth más abajo) para los casos largos.
  name: { centerX: PAGE_W / 2, y: PAGE_H - 314, size: 26 },
  // Debajo de la etiqueta "Número de certificado" (termina en y=323.2).
  certNumber: { x: 674.6, y: PAGE_H - 340, size: 14 },
  // Debajo de la etiqueta "Fecha de finalización" (termina en y=373.4).
  issueDate: { x: 674.6, y: PAGE_H - 390, size: 14 },
  // Arriba de la firma de Santo González (empieza en y=426.4), hueco a la izquierda.
  qr: { x: 100, y: PAGE_H - 420, size: 120 },
};

// Genera el PDF del certificado. Devuelve un Uint8Array.
// Si existe public/plantilla.png la usa de fondo (diseño de Canva exportado);
// si no, dibuja un certificado limpio desde cero.
export async function certificatePdf(cert) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_W, PAGE_H]);
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

  const fullName = cert.full_name || `${cert.first_name || ""} ${cert.last_name || ""}`.trim();

  if (hasBg) {
    // El diseño ya trae fijos programa, horas, firma y estado. Solo faltan estos 3 campos.
    // Centrado en PAGE_W/2, el ancho libre real hasta el QR (izquierda) es más angosto que
    // hasta el panel de datos (derecha); 380pt es el máximo simétrico que no pisa ninguno
    // de los dos. Si el nombre no entra al tamaño base, se achica hasta que quepa.
    const maxNameWidth = 380;
    let nameSize = LAYOUT.name.size;
    let nameWidth = bold.widthOfTextAtSize(fullName, nameSize);
    while (nameWidth > maxNameWidth && nameSize > 14) {
      nameSize -= 1;
      nameWidth = bold.widthOfTextAtSize(fullName, nameSize);
    }
    page.drawText(fullName, {
      x: LAYOUT.name.centerX - nameWidth / 2, y: LAYOUT.name.y, size: nameSize, font: bold, color: NAVY,
    });
    page.drawText(cert.certificate_number, {
      x: LAYOUT.certNumber.x, y: LAYOUT.certNumber.y, size: LAYOUT.certNumber.size, font: bold, color: NAVY,
    });
    page.drawText(fmtDate(cert.issue_date), {
      x: LAYOUT.issueDate.x, y: LAYOUT.issueDate.y, size: LAYOUT.issueDate.size, font: bold, color: NAVY,
    });
  } else {
    // Marco simple (fallback si no hay plantilla)
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: GOLD, borderWidth: 2 });
    page.drawText("GOVBIDDER ACADEMY", { x: 60, y: height - 80, size: 16, font: bold, color: NAVY });
    page.drawText("CERTIFICATE OF COMPLETION", { x: 60, y: height - 110, size: 26, font: bold, color: NAVY });
    page.drawText("Awarded to", { x: 60, y: height - 180, size: 12, font, color: GREY });
    page.drawText(fullName, { x: 60, y: height - 215, size: 30, font: bold, color: NAVY });

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

  // QR: arriba a la derecha en el diseño simple; arriba de la firma en la plantilla real.
  const qrBuf = await qrPng(cert.certificate_number, 400);
  const qrImg = await pdf.embedPng(qrBuf);
  if (hasBg) {
    page.drawImage(qrImg, { x: LAYOUT.qr.x, y: LAYOUT.qr.y, width: LAYOUT.qr.size, height: LAYOUT.qr.size });
  } else {
    const qrSize = 120;
    page.drawImage(qrImg, { x: width - qrSize - 60, y: 60, width: qrSize, height: qrSize });
    page.drawText("Escaneá para verificar", { x: width - qrSize - 60, y: 45, size: 8, font, color: GREY });
  }

  return pdf.save();
}

function fmtDate(d) {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    // Usa los componentes UTC: issue_date es una fecha (sin hora), y a medianoche UTC
    // el huso horario local del proceso puede correrla un día si se usa toLocaleDateString directo.
    return dt.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  } catch (_) {
    return String(d);
  }
}
