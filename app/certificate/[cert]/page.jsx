// Página única de verificación. El número viene en la URL:
//   /certificate/GBC-26G-0001
import { publicClient } from "../../../lib/supabase.js";

export const dynamic = "force-dynamic";

function fmtDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch { return String(d); }
}

const STATUS = {
  active:  { cls: "status-valid",   title: "VALID",    sub: "This certificate is active and in good standing." },
  revoked: { cls: "status-bad",     title: "REVOKED",  sub: "This certificate was revoked and is no longer valid." },
  pending: { cls: "status-pending", title: "PENDING",  sub: "This certificate is pending confirmation." },
};

function TopBar() {
  return (
    <div className="topbar"><div className="wrap">
      <a className="logo" href="/" style={{ textDecoration: "none" }}>G</a>
      <span style={{ fontWeight: 500 }}>GovBidder Certificate Verification</span>
      <nav className="nav"><a href="/">Verify another</a></nav>
    </div></div>
  );
}

function Seal() {
  return (
    <div className="seal">
      <div style={{ fontSize: 20 }}>★</div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em" }}>VERIFIED</div>
      <div style={{ fontSize: 13, fontWeight: 700 }}>2026</div>
    </div>
  );
}

export default async function CertificatePage({ params }) {
  const number = decodeURIComponent(params.cert).toUpperCase();
  const supabase = publicClient();
  const { data: cert } = await supabase
    .from("certificates").select("*").eq("certificate_number", number).single();

  return (
    <>
      <TopBar />
      <section className="hero"><div className="wrap">
        <div className="eyebrow">Official verification portal</div>
        <h1 style={{ fontSize: 28 }}>Verification result</h1>
      </div></section>

      <div className="result">
        {!cert ? (
          <div className="panel">
            <div className="status-nf"><h2>NOT FOUND</h2>
              <div className="muted">No record matches this number.</div></div>
            <div className="body"><div className="fields">
              <p>No certificate with the number <b>{number}</b> was found in the registry.</p>
              <p className="muted">Check the number for typing mistakes. Numbers look like GBC-26G-0001.
              If you keep seeing this for a certificate you believe is genuine, email team@govbidder.net.</p>
              <p><a href="/">← Try another number</a></p>
            </div></div>
          </div>
        ) : (() => {
          const s = STATUS[cert.status] || STATUS.active;
          return (
            <div className="panel">
              <div className={s.cls}><h2>{s.title}</h2><div className="muted">{s.sub}</div></div>
              <div className="body">
                <div className="fields">
                  <div className="label">Awarded to</div>
                  <div className="name">{cert.full_name || `${cert.first_name || ""} ${cert.last_name || ""}`.trim()}</div>
                  <div className="grid">
                    <div className="field"><div className="label">Program</div><div className="val">{cert.program || "-"}</div></div>
                    <div className="field"><div className="label">Certificate type</div><div className="val">{cert.certificate_type || "-"}</div></div>
                    <div className="field"><div className="label">Completed on</div><div className="val">{fmtDate(cert.issue_date)}</div></div>
                    <div className="field"><div className="label">Hours completed</div><div className="val">{cert.hours ? `${cert.hours} hours` : "-"}</div></div>
                    <div className="field"><div className="label">Issued by</div><div className="val">{cert.issued_by || "-"}</div></div>
                    <div className="field"><div className="label">Signed by</div><div className="val">{cert.signed_by || "-"}</div></div>
                  </div>
                  <p style={{ marginTop: 20 }}>
                    <a className="btn" href={`/api/certificates/${encodeURIComponent(number)}/pdf`}>Download PDF</a>
                  </p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <Seal />
                  <div className="certno">
                    <div className="label">Certificate no.</div>
                    <div style={{ fontWeight: 700, color: "var(--navy)" }}>{cert.certificate_number}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      <div style={{ height: 40 }} />
    </>
  );
}
