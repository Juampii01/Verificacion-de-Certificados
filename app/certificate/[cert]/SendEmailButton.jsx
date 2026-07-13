"use client";
import { useState } from "react";
import { t } from "../../../lib/i18n.jsx";

function MailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 6.5C3 5.67157 3.67157 5 4.5 5H19.5C20.3284 5 21 5.67157 21 6.5V17.5C21 18.3284 20.3284 19 19.5 19H4.5C3.67157 19 3 18.3284 3 17.5V6.5Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 6.5L12 13L20 6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// No hay descarga directa del PDF: se manda por email a la dirección registrada
// del certificado, para que tener el número no alcance para bajarse el PDF ajeno.
export default function SendEmailButton({ certificateNumber, maskedEmail, lang }) {
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");
  const s = t(lang);

  async function send() {
    setState("sending"); setError("");
    try {
      const res = await fetch(`/api/certificates/${encodeURIComponent(certificateNumber)}/send-email`, {
        method: "POST",
      });
      const j = await res.json();
      if (!res.ok) { setState("error"); setError(j.error || s.sendFailedGeneric); return; }
      setState("sent");
    } catch (err) {
      setState("error"); setError(err.message);
    }
  }

  if (state === "sent") {
    return (
      <div className="send-confirm">
        <span className="send-confirm-icon">✓</span>
        <span>{s.sentSuccess(maskedEmail)}</span>
      </div>
    );
  }

  return (
    <div>
      <button className="btn" onClick={send} disabled={state === "sending"}>
        <MailIcon />
        {state === "sending" ? s.sending : s.sendToEmail}
      </button>
      {maskedEmail && (
        <div className="muted" style={{ marginTop: 8 }}>{s.willSendTo(maskedEmail)}</div>
      )}
      {state === "error" && <div className="send-error">{error}</div>}
    </div>
  );
}
