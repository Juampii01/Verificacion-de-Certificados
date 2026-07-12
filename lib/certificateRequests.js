// lib/certificateRequests.js
// Lógica de la cola de solicitudes públicas de certificado: matching contra
// eligible_participants, creación de la solicitud, y aprobación/rechazo.
import { adminClient } from "./supabase.js";
import { createCertificates } from "./createCertificates.js";
import { sendCertificateReadyEmail, sendCertificateRejectedEmail } from "./email.js";

export const MAX_NAME_LENGTH = 45;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Crea una solicitud a partir del formulario público. Si el email matchea contra
// la lista de elegibles ("día 4"), aprueba y crea el certificado al instante.
// Si no, la deja pendiente para que el admin la revise a mano.
export async function submitCertificateRequest({ first_name, last_name, full_name, email }) {
  const supabase = adminClient();
  const cleanEmail = normalizeEmail(email);
  const cleanFullName = String(full_name || "").trim().slice(0, MAX_NAME_LENGTH);

  if (!last_name || !String(last_name).trim()) {
    return { error: "Falta el apellido" };
  }
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { error: "Email inválido" };
  }
  if (!cleanFullName) {
    return { error: "Falta el nombre a mostrar en el certificado" };
  }

  const { data: match } = await supabase
    .from("eligible_participants")
    .select("id")
    .eq("email", cleanEmail)
    .maybeSingle();

  const baseRow = {
    first_name: first_name || null,
    last_name,
    full_name: cleanFullName,
    email: cleanEmail,
    matched_eligible: !!match,
  };

  if (match) {
    const result = await createCertificates([{
      first_name, last_name, full_name: cleanFullName, email: cleanEmail,
    }]);
    if (result.errors.length) {
      return { error: result.errors.map((e) => e.error).join("; ") };
    }
    const created = result.created[0];
    const { data: reqRow } = await supabase
      .from("certificate_requests")
      .insert({ ...baseRow, status: "approved", certificate_number: created.certificate_number, reviewed_at: new Date().toISOString() })
      .select()
      .single();
    // El certificado ya quedó creado igual si el email falla; solo se informa el estado del envío.
    let email_sent = true, email_error = null;
    try {
      await sendCertificateReadyEmail(cleanEmail, {
        full_name: cleanFullName, certificate_number: created.certificate_number,
      });
    } catch (e) {
      email_sent = false; email_error = e.message;
      console.error("sendCertificateReadyEmail falló:", e);
    }
    return { status: "approved", certificate_number: created.certificate_number, request: reqRow, email_sent, email_error };
  }

  const { data: reqRow, error } = await supabase
    .from("certificate_requests")
    .insert({ ...baseRow, status: "pending_review" })
    .select()
    .single();
  if (error) return { error: error.message };
  return { status: "pending_review", request: reqRow };
}

// Aprueba manualmente una solicitud pendiente: crea el certificado y envía el email.
export async function approveCertificateRequest(id) {
  const supabase = adminClient();
  const { data: reqRow, error: fetchErr } = await supabase
    .from("certificate_requests").select("*").eq("id", id).single();
  if (fetchErr || !reqRow) return { error: "Solicitud no encontrada" };
  if (reqRow.status !== "pending_review") return { error: "La solicitud ya fue revisada" };

  const result = await createCertificates([{
    first_name: reqRow.first_name, last_name: reqRow.last_name,
    full_name: reqRow.full_name, email: reqRow.email,
  }]);
  if (result.errors.length) return { error: result.errors.map((e) => e.error).join("; ") };
  const created = result.created[0];

  const { data: updated } = await supabase
    .from("certificate_requests")
    .update({ status: "approved", certificate_number: created.certificate_number, reviewed_at: new Date().toISOString() })
    .eq("id", id).select().single();

  let email_sent = true, email_error = null;
  try {
    await sendCertificateReadyEmail(reqRow.email, {
      full_name: reqRow.full_name, certificate_number: created.certificate_number,
    });
  } catch (e) {
    email_sent = false; email_error = e.message;
    console.error("sendCertificateReadyEmail falló:", e);
  }

  return { status: "approved", certificate_number: created.certificate_number, request: updated, email_sent, email_error };
}

// Rechaza una solicitud pendiente y avisa por email.
export async function rejectCertificateRequest(id) {
  const supabase = adminClient();
  const { data: reqRow, error: fetchErr } = await supabase
    .from("certificate_requests").select("*").eq("id", id).single();
  if (fetchErr || !reqRow) return { error: "Solicitud no encontrada" };
  if (reqRow.status !== "pending_review") return { error: "La solicitud ya fue revisada" };

  const { data: updated } = await supabase
    .from("certificate_requests")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id).select().single();

  let email_sent = true, email_error = null;
  try {
    await sendCertificateRejectedEmail(reqRow.email, { full_name: reqRow.full_name });
  } catch (e) {
    email_sent = false; email_error = e.message;
    console.error("sendCertificateRejectedEmail falló:", e);
  }

  return { status: "rejected", request: updated, email_sent, email_error };
}

export async function listPendingRequests() {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("certificate_requests")
    .select("*")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });
  if (error) return { error: error.message };
  return { requests: data };
}
