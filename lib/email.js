// lib/email.js
// Envío de emails transaccionales vía Resend (certificado listo / solicitud rechazada).
import { Resend } from "resend";
import { verifyUrl } from "./pdf.js";

const FROM = process.env.RESEND_FROM || "certificados@send.govbidder.net";

function client() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendCertificateReadyEmail(to, { full_name, certificate_number }) {
  const url = verifyUrl(certificate_number);
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#152978">Tu certificado GovBidder está listo</h2>
      <p>Hola ${full_name},</p>
      <p>Tu certificado <b>${certificate_number}</b> ya está activo. Podés verificarlo en el
      siguiente enlace, y desde ahí pedir que te lo reenviemos por email cuando quieras.</p>
      <p>
        <a href="${url}" style="background:#152978;color:#fff;padding:10px 18px;
           border-radius:6px;text-decoration:none;display:inline-block">Ver mi certificado</a>
      </p>
      <p style="color:#5a6068;font-size:13px">GovBidder Academy</p>
    </div>`;
  return client().emails.send({
    from: FROM,
    to,
    subject: "Tu certificado GovBidder está listo",
    html,
  });
}

// Envía el PDF del certificado adjunto a la dirección REGISTRADA del certificado
// (nunca a una dirección arbitraria que pida el visitante) — es la única forma de
// obtener el PDF, no hay descarga directa pública.
export async function sendCertificatePdfEmail(to, { full_name, certificate_number, pdfBytes }) {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#152978">Tu certificado GovBidder</h2>
      <p>Hola ${full_name},</p>
      <p>Adjunto te enviamos el PDF de tu certificado <b>${certificate_number}</b>, como
      pediste desde la página de verificación.</p>
      <p style="color:#5a6068;font-size:13px">GovBidder Academy</p>
    </div>`;
  return client().emails.send({
    from: FROM,
    to,
    subject: `Tu certificado GovBidder ${certificate_number}`,
    html,
    attachments: [
      { filename: `${certificate_number}.pdf`, content: Buffer.from(pdfBytes) },
    ],
  });
}

export async function sendCertificateRejectedEmail(to, { full_name }) {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#152978">Tu solicitud de certificado necesita revisión</h2>
      <p>Hola ${full_name},</p>
      <p>No pudimos confirmar automáticamente tu solicitud de certificado con los datos
      recibidos. Nuestro equipo la revisó manualmente y por ahora no fue aprobada.</p>
      <p>Si creés que esto es un error (por ejemplo, si usaste un email distinto al de tu
      inscripción), respondé a este correo para que lo revisemos.</p>
      <p style="color:#5a6068;font-size:13px">GovBidder Academy</p>
    </div>`;
  return client().emails.send({
    from: FROM,
    to,
    subject: "Tu solicitud de certificado GovBidder necesita revisión",
    html,
  });
}
