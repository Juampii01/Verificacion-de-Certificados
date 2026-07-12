"use client";
import { useState } from "react";

export default function Admin() {
  const [token, setToken] = useState("");
  const [tab, setTab] = useState("single");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

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
          `PDF:     /api/certificates/${c.certificate_number}/pdf\n` +
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

  return (
    <main className="admin">
      <h1>Panel administrativo · Certificados</h1>

      <label style={{ display: "block", maxWidth: 360 }}>
        <div className="label">Contraseña admin</div>
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
               placeholder="ADMIN_TOKEN" style={{ width: "100%", padding: 10, marginTop: 4 }} />
      </label>

      <div className="tabs">
        <div className={`tab ${tab === "single" ? "active" : ""}`} onClick={() => setTab("single")}>Alta individual</div>
        <div className={`tab ${tab === "bulk" ? "active" : ""}`} onClick={() => setTab("bulk")}>Carga masiva (Excel/CSV)</div>
        <div className="tab" onClick={exportCanva} title="Descarga el CSV con datos + URL del QR para Canva Bulk Create">⬇ CSV para Canva</div>
      </div>

      {tab === "single" ? (
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
      ) : (
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

      {out && <div className="out">{out}</div>}
    </main>
  );
}
