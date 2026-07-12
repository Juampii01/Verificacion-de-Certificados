"use client";
import { useState } from "react";

// No hay descarga directa del PDF: se manda por email a la dirección registrada
// del certificado, para que tener el número no alcance para bajarse el PDF ajeno.
export default function SendEmailButton({ certificateNumber, maskedEmail }) {
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  async function send() {
    setState("sending"); setError("");
    try {
      const res = await fetch(`/api/certificates/${encodeURIComponent(certificateNumber)}/send-email`, {
        method: "POST",
      });
      const j = await res.json();
      if (!res.ok) { setState("error"); setError(j.error || "No se pudo enviar."); return; }
      setState("sent");
    } catch (err) {
      setState("error"); setError(err.message);
    }
  }

  if (state === "sent") {
    return <p style={{ color: "var(--navy)", fontWeight: 600 }}>✓ Enviado a {maskedEmail}. Revisá tu bandeja de entrada.</p>;
  }

  return (
    <div>
      <button className="btn" onClick={send} disabled={state === "sending"}>
        {state === "sending" ? "Enviando..." : "Enviar certificado a mi email"}
      </button>
      {maskedEmail && (
        <div className="muted" style={{ marginTop: 6 }}>Se enviará a {maskedEmail}</div>
      )}
      {state === "error" && <div style={{ color: "var(--red)", marginTop: 8, fontSize: 14 }}>{error}</div>}
    </div>
  );
}
