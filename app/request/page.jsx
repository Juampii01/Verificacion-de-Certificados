"use client";
import { useState } from "react";

// Debe coincidir con MAX_NAME_LENGTH en lib/certificateRequests.js (no se importa acá
// porque ese módulo trae dependencias de servidor que no deben llegar al bundle del cliente).
const MAX_NAME_LENGTH = 45;

function TopBar() {
  return (
    <div className="topbar"><div className="wrap">
      <a className="logo" href="/" style={{ textDecoration: "none" }}>G</a>
      <span style={{ fontWeight: 500 }}>GovBidder Certificate Verification</span>
      <nav className="nav"><a href="/">Verify a certificate</a></nav>
    </div></div>
  );
}

export default function RequestCertificate() {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", full_name: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/certificate-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error || "No se pudo enviar la solicitud."); }
      else { setResult(j); }
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  return (
    <main>
      <TopBar />
      <section className="hero"><div className="wrap">
        <div className="eyebrow">Solicitud de certificado</div>
        <h1>Pedí tu certificado GovBidder</h1>
        <p>Completá tus datos. Si ya completaste el programa, tu certificado se genera y se
        envía a tu email automáticamente. Si no podemos confirmarlo al instante, nuestro equipo
        lo revisa a mano y te avisamos por email.</p>

        <div className="card">
          {result ? (
            <div>
              {result.status === "approved" ? (
                <>
                  <h2 style={{ color: "var(--navy)", margin: "0 0 8px" }}>¡Listo!</h2>
                  <p>Tu certificado <b>{result.certificate_number}</b> ya está activo.{" "}
                  {result.email_sent
                    ? "Te enviamos el enlace por email."
                    : "No pudimos enviarte el email, pero ya podés verificarlo con este número."}</p>
                </>
              ) : (
                <>
                  <h2 style={{ color: "var(--navy)", margin: "0 0 8px" }}>Recibimos tu solicitud</h2>
                  <p>No pudimos confirmarlo automáticamente. Nuestro equipo lo va a revisar y te
                  avisamos por email apenas quede listo.</p>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="form-grid">
                <label>Nombre
                  <input value={form.first_name} onChange={set("first_name")} required />
                </label>
                <label>Apellido *
                  <input value={form.last_name} onChange={set("last_name")} required />
                </label>
                <label className="full">Email
                  <input type="email" value={form.email} onChange={set("email")} required />
                </label>
                <label className="full">
                  Cómo querés que aparezca tu nombre en el certificado
                  <input
                    value={form.full_name}
                    onChange={set("full_name")}
                    maxLength={MAX_NAME_LENGTH}
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                  <span className="muted">{form.full_name.length}/{MAX_NAME_LENGTH} caracteres</span>
                </label>
              </div>
              {error && <div style={{ color: "var(--red)", marginTop: 10, fontSize: 14 }}>{error}</div>}
              <div style={{ marginTop: 16 }}>
                <button className="btn" style={{ padding: "12px 22px" }} disabled={busy}>
                  {busy ? "Enviando..." : "Solicitar certificado"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div></section>
    </main>
  );
}
