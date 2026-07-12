"use client";
import { useState, useEffect } from "react";

const TOKEN_KEY = "gb_admin_token";

// Debe coincidir con certificateFilename() en lib/pdf.js (no se importa acá porque
// ese módulo trae pdf-lib/fs, dependencias de servidor que no deben llegar al cliente).
function certificateFilename(cert) {
  const clean = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, "").trim();
  const name = clean(cert.full_name || `${cert.first_name || ""} ${cert.last_name || ""}`.trim()) || cert.certificate_number;
  const program = clean(cert.program || "GovBidder Challenge");
  return `${name} - ${program} - Certificado.pdf`;
}

export default function Admin() {
  const [token, setToken] = useState("");
  // null = todavía comprobando el token guardado; true/false = resultado.
  const [authed, setAuthed] = useState(null);
  const [loginInput, setLoginInput] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [tab, setTab] = useState("single");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState(null);
  const [certs, setCerts] = useState(null);
  const [certsLoading, setCertsLoading] = useState(false);
  const [rowBusy, setRowBusy] = useState({});

  // Valida un token contra el servidor (usa un endpoint admin liviano) antes
  // de mostrar el panel. Sin esto, cualquiera vería la interfaz aunque no
  // pudiera hacer nada con ella.
  async function verifyToken(candidate) {
    try {
      const res = await fetch("/api/certificate-requests", { headers: { "x-admin-token": candidate } });
      return res.status !== 401;
    } catch {
      return false;
    }
  }

  // Al cargar: si hay un token guardado, lo valida antes de mostrar el panel.
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) { setAuthed(false); return; }
    verifyToken(saved).then((ok) => {
      if (ok) { setToken(saved); setAuthed(true); }
      else { localStorage.removeItem(TOKEN_KEY); setAuthed(false); }
    });
  }, []);

  async function login(e) {
    e.preventDefault();
    setLoginBusy(true); setLoginError("");
    const ok = await verifyToken(loginInput);
    if (ok) {
      localStorage.setItem(TOKEN_KEY, loginInput);
      setToken(loginInput);
      setAuthed(true);
    } else {
      setLoginError("Contraseña incorrecta.");
    }
    setLoginBusy(false);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(""); setLoginInput(""); setAuthed(false);
  }

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    program: "GovBidder Challenge", certificate_type: "Certificate of Completion",
    issue_date: "", hours: "16", signed_by: "Santo González", status: "active",
    certificate_number: "",
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submitSingle(e) {
    e.preventDefault();
    setBusy(true); setOut("");
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) { setOut("ERROR: " + JSON.stringify(j.errors || j, null, 2)); }
      else {
        const c = j.created[0];
        setOut(
          `✓ Certificado creado\n` +
          `Número:  ${c.certificate_number}\n` +
          `Verify:  /certificate/${c.certificate_number}\n` +
          `QR:      /api/certificates/${c.certificate_number}/qr`
        );
      }
    } catch (err) { setOut("ERROR: " + err.message); }
    setBusy(false);
  }

  async function exportCanva() {
    setBusy(true); setOut("Generando CSV para Canva...");
    try {
      const res = await fetch("/api/certificates/export", { headers: { "x-admin-token": token } });
      if (!res.ok) { setOut("ERROR: " + (await res.text())); setBusy(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "canva-bulk-create.csv"; a.click();
      URL.revokeObjectURL(url);
      setOut("✓ CSV descargado. Subilo a Canva → Bulk Create.");
    } catch (err) { setOut("ERROR: " + err.message); }
    setBusy(false);
  }

  async function submitBulk(e) {
    e.preventDefault();
    const file = e.target.file.files[0];
    if (!file) { setOut("Elegí un archivo Excel o CSV."); return; }
    setBusy(true); setOut("Procesando...");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/certificates/bulk", {
        method: "POST", headers: { "x-admin-token": token }, body: fd,
      });
      const j = await res.json();
      if (!res.ok && !j.creados) { setOut("ERROR: " + JSON.stringify(j, null, 2)); }
      else {
        let txt = `✓ ${j.creados} de ${j.total} certificados creados\n\n`;
        (j.created || []).forEach((c) => { txt += `${c.certificate_number}  ·  ${c.full_name}\n`; });
        if (j.errores && j.errores.length) txt += `\nErrores:\n` + JSON.stringify(j.errores, null, 2);
        setOut(txt);
      }
    } catch (err) { setOut("ERROR: " + err.message); }
    setBusy(false);
  }

  async function submitEligibleBulk(e) {
    e.preventDefault();
    const file = e.target.file.files[0];
    if (!file) { setOut("Elegí un archivo Excel o CSV."); return; }
    setBusy(true); setOut("Procesando lista de elegibles...");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/eligible-participants/bulk", {
        method: "POST", headers: { "x-admin-token": token }, body: fd,
      });
      const j = await res.json();
      if (!res.ok) { setOut("ERROR: " + JSON.stringify(j, null, 2)); }
      else { setOut(`✓ ${j.importados} de ${j.total} emails cargados a la lista de elegibles.`); }
    } catch (err) { setOut("ERROR: " + err.message); }
    setBusy(false);
  }

  async function loadRequests() {
    setBusy(true); setOut("");
    try {
      const res = await fetch("/api/certificate-requests", { headers: { "x-admin-token": token } });
      const j = await res.json();
      if (!res.ok) { setOut("ERROR: " + JSON.stringify(j, null, 2)); }
      else { setRequests(j.requests); }
    } catch (err) { setOut("ERROR: " + err.message); }
    setBusy(false);
  }

  async function decideRequest(id, action) {
    setBusy(true); setOut("");
    try {
      const res = await fetch(`/api/certificate-requests/${id}/${action}`, {
        method: "POST", headers: { "x-admin-token": token },
      });
      const j = await res.json();
      if (!res.ok) { setOut("ERROR: " + JSON.stringify(j, null, 2)); }
      else {
        const emailNote = j.email_sent ? "" : `\n⚠ El email NO se pudo enviar: ${j.email_error}`;
        setOut((action === "approve"
          ? `✓ Certificado ${j.certificate_number} creado.`
          : `✓ Solicitud rechazada.`) + emailNote);
        await loadRequests();
      }
    } catch (err) { setOut("ERROR: " + err.message); }
    setBusy(false);
  }

  async function loadCerts() {
    setCertsLoading(true); setOut("");
    try {
      const res = await fetch("/api/certificates", { headers: { "x-admin-token": token } });
      const j = await res.json();
      if (!res.ok) { setOut("ERROR: " + JSON.stringify(j, null, 2)); }
      else { setCerts(j.certificates); }
    } catch (err) { setOut("ERROR: " + err.message); }
    setCertsLoading(false);
  }

  async function sendCertEmail(cert) {
    setRowBusy((b) => ({ ...b, [cert.certificate_number]: "email" })); setOut("");
    try {
      const res = await fetch(`/api/certificates/${encodeURIComponent(cert.certificate_number)}/send-email`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) setOut(`ERROR (${cert.certificate_number}): ` + (j.error || "no se pudo enviar"));
      else setOut(`✓ Email enviado a ${j.email} (${cert.certificate_number}).`);
    } catch (err) { setOut("ERROR: " + err.message); }
    setRowBusy((b) => ({ ...b, [cert.certificate_number]: null }));
  }

  async function downloadCertPdf(cert) {
    setRowBusy((b) => ({ ...b, [cert.certificate_number]: "pdf" })); setOut("");
    try {
      const res = await fetch(`/api/certificates/${encodeURIComponent(cert.certificate_number)}/pdf`, {
        headers: { "x-admin-token": token },
      });
      if (!res.ok) {
        setOut("ERROR: " + (res.status === 404 ? "certificado no encontrado" : await res.text()));
        setRowBusy((b) => ({ ...b, [cert.certificate_number]: null }));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = certificateFilename(cert); a.click();
      URL.revokeObjectURL(url);
      setOut(`✓ PDF de ${cert.full_name || cert.certificate_number} descargado.`);
    } catch (err) { setOut("ERROR: " + err.message); }
    setRowBusy((b) => ({ ...b, [cert.certificate_number]: null }));
  }

  if (authed !== true) {
    return (
      <main className="admin">
        <h1>Panel administrativo · Certificados</h1>
        <form onSubmit={login} style={{ maxWidth: 360, marginTop: 20 }}>
          <label style={{ display: "block" }}>
            <div className="label">Contraseña admin</div>
            <input
              type="password" value={loginInput} autoFocus
              onChange={(e) => { setLoginInput(e.target.value); setLoginError(""); }}
              placeholder="ADMIN_TOKEN" style={{ width: "100%", padding: 10, marginTop: 4 }}
            />
          </label>
          {loginError && <div style={{ color: "var(--red)", marginTop: 8, fontSize: 14 }}>{loginError}</div>}
          <button className="btn" style={{ marginTop: 14, padding: "12px 22px" }} disabled={loginBusy || authed === null}>
            {authed === null ? "Verificando..." : loginBusy ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin">
      <h1>Panel administrativo · Certificados</h1>
      <button
        onClick={logout}
        style={{ background: "none", border: "none", color: "var(--grey)", textDecoration: "underline", cursor: "pointer", padding: 0, marginBottom: 20, fontSize: 13 }}
      >
        Cerrar sesión
      </button>

      <div className="tabs">
        <div className={`tab ${tab === "single" ? "active" : ""}`} onClick={() => setTab("single")}>Alta individual</div>
        <div className={`tab ${tab === "bulk" ? "active" : ""}`} onClick={() => setTab("bulk")}>Carga masiva (Excel/CSV)</div>
        <div className={`tab ${tab === "requests" ? "active" : ""}`}
             onClick={() => { setTab("requests"); loadRequests(); }}>Solicitudes pendientes</div>
        <div className={`tab ${tab === "eligible" ? "active" : ""}`} onClick={() => setTab("eligible")}>Lista de elegibles (día 4)</div>
        <div className={`tab ${tab === "list" ? "active" : ""}`}
             onClick={() => { setTab("list"); loadCerts(); }}>Todos los certificados</div>
        <div className="tab" onClick={exportCanva} title="Descarga el CSV con datos + URL del QR para Canva Bulk Create">⬇ CSV para Canva</div>
      </div>

      {tab === "single" && (
        <form className="form-grid" onSubmit={submitSingle}>
          <label>Nombre<input value={form.first_name} onChange={set("first_name")} /></label>
          <label>Apellido *<input value={form.last_name} onChange={set("last_name")} required /></label>
          <label>Correo<input value={form.email} onChange={set("email")} type="email" /></label>
          <label>Programa<input value={form.program} onChange={set("program")} /></label>
          <label>Fecha de emisión<input value={form.issue_date} onChange={set("issue_date")} type="date" /></label>
          <label>Horas<input value={form.hours} onChange={set("hours")} type="number" /></label>
          <label>Firmado por<input value={form.signed_by} onChange={set("signed_by")} /></label>
          <label>Estado
            <select value={form.status} onChange={set("status")}>
              <option value="active">activo</option>
              <option value="pending">pendiente</option>
              <option value="revoked">revocado</option>
            </select>
          </label>
          <label className="full">Número (dejar vacío para generar automático)
            <input value={form.certificate_number} onChange={set("certificate_number")} placeholder="Se genera: GBC-26X-0001" />
          </label>
          <div className="full">
            <button className="btn" style={{ padding: "12px 22px" }} disabled={busy}>
              {busy ? "Creando..." : "Generar certificado"}
            </button>
          </div>
        </form>
      )}

      {tab === "bulk" && (
        <form onSubmit={submitBulk}>
          <p className="muted">
            El archivo debe tener columnas: <b>Nombre, Apellido, Correo, Programa, Fecha de emisión, Número de certificado</b> (el número es opcional; si va vacío se genera solo).
          </p>
          <input type="file" name="file" accept=".xlsx,.xls,.csv" />
          <div style={{ marginTop: 14 }}>
            <button className="btn" style={{ padding: "12px 22px" }} disabled={busy}>
              {busy ? "Procesando..." : "Cargar y crear certificados"}
            </button>
          </div>
        </form>
      )}

      {tab === "requests" && (
        <div>
          <p className="muted">
            Solicitudes hechas desde el formulario público (<code>/request</code>) que no matchearon
            automáticamente contra la lista de elegibles. Aprobá para crear el certificado y avisar
            por email, o rechazá para avisar que quedó sin aprobar.
          </p>
          <button className="btn" style={{ padding: "8px 16px", marginBottom: 14 }} onClick={loadRequests} disabled={busy}>
            {busy ? "Cargando..." : "↻ Actualizar lista"}
          </button>
          {requests && requests.length === 0 && <p className="muted">No hay solicitudes pendientes.</p>}
          {requests && requests.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {requests.map((r) => (
                <div key={r.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--navy)" }}>{r.full_name}</div>
                    <div className="muted">{r.email} · {r.first_name} {r.last_name}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" disabled={busy} onClick={() => decideRequest(r.id, "approve")}>Aprobar</button>
                    <button className="btn" style={{ background: "var(--red)" }} disabled={busy} onClick={() => decideRequest(r.id, "reject")}>Rechazar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "eligible" && (
        <form onSubmit={submitEligibleBulk}>
          <p className="muted">
            Subí la lista de quienes completaron el día 4 (columnas: <b>Nombre, Apellido, Correo</b>).
            Cuando alguien pida su certificado en <code>/request</code> con un email de esta lista,
            se aprueba y envía automáticamente. Se puede volver a subir para agregar más gente
            (no duplica, actualiza por email).
          </p>
          <input type="file" name="file" accept=".xlsx,.xls,.csv" />
          <div style={{ marginTop: 14 }}>
            <button className="btn" style={{ padding: "12px 22px" }} disabled={busy}>
              {busy ? "Procesando..." : "Cargar lista de elegibles"}
            </button>
          </div>
        </form>
      )}

      {tab === "list" && (
        <div>
          <p className="muted">
            Todos los certificados creados. Enviá el email al registrado, o descargá el PDF
            directo (el archivo se guarda con el nombre y apellido de la persona, no el número).
          </p>
          <button className="btn" style={{ padding: "8px 16px", marginBottom: 14 }} onClick={loadCerts} disabled={certsLoading}>
            {certsLoading ? "Cargando..." : "↻ Actualizar lista"}
          </button>
          {certs && certs.length === 0 && <p className="muted">No hay certificados todavía.</p>}
          {certs && certs.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
                    <th style={{ padding: "8px 6px" }}>Número</th>
                    <th style={{ padding: "8px 6px" }}>Nombre</th>
                    <th style={{ padding: "8px 6px" }}>Email</th>
                    <th style={{ padding: "8px 6px" }}>Estado</th>
                    <th style={{ padding: "8px 6px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {certs.map((c) => {
                    const rb = rowBusy[c.certificate_number];
                    return (
                      <tr key={c.certificate_number} style={{ borderBottom: "1px solid #f2f2f2" }}>
                        <td style={{ padding: "8px 6px", fontWeight: 600, color: "var(--navy)", whiteSpace: "nowrap" }}>{c.certificate_number}</td>
                        <td style={{ padding: "8px 6px" }}>{c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim()}</td>
                        <td style={{ padding: "8px 6px" }}>{c.email || <span className="muted">sin email</span>}</td>
                        <td style={{ padding: "8px 6px" }}>{c.status}</td>
                        <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                          <button
                            className="btn" style={{ padding: "6px 10px", fontSize: 13, marginRight: 6 }}
                            disabled={!c.email || !!rb}
                            title={!c.email ? "Este certificado no tiene email registrado" : ""}
                            onClick={() => sendCertEmail(c)}
                          >
                            {rb === "email" ? "Enviando..." : "Enviar email"}
                          </button>
                          <button
                            className="btn" style={{ padding: "6px 10px", fontSize: 13 }}
                            disabled={!!rb}
                            onClick={() => downloadCertPdf(c)}
                          >
                            {rb === "pdf" ? "Descargando..." : "Descargar PDF"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {out && <div className="out">{out}</div>}
    </main>
  );
}
