"use client";
import { LANG_COOKIE } from "../lib/i18n.jsx";

// Selector EN/ES para las páginas públicas. Guarda la elección en una cookie
// (leída por las páginas servidor) y recarga para que todo quede consistente.
export default function LangToggle({ lang }) {
  function switchTo(next) {
    if (next === lang) return;
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000`;
    window.location.reload();
  }

  return (
    <div style={{ display: "flex", gap: 4, fontSize: 13 }}>
      <button
        onClick={() => switchTo("en")}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: "2px 4px",
          color: lang === "en" ? "#fff" : "#9fb0cc",
          fontWeight: lang === "en" ? 700 : 400,
          textDecoration: lang === "en" ? "underline" : "none",
        }}
      >EN</button>
      <span style={{ color: "#9fb0cc" }}>|</span>
      <button
        onClick={() => switchTo("es")}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: "2px 4px",
          color: lang === "es" ? "#fff" : "#9fb0cc",
          fontWeight: lang === "es" ? 700 : 400,
          textDecoration: lang === "es" ? "underline" : "none",
        }}
      >ES</button>
    </div>
  );
}
