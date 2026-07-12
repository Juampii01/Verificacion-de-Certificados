// lib/certNumber.js
// Generación del número de certificado en formato GBC-26X-0001
//
//   GBC  = GovBidder Challenge (constante)
//   26   = últimos 2 dígitos del año de emisión
//   X    = primera letra del APELLIDO (normalizada, sin acentos)
//   0001 = número global ascendente, 4 dígitos, se asigna a medida que se crean
//
// Regla clave: la inicial sale de la columna "Apellido" del formulario / XLS.
// No se adivina desde el nombre completo (por eso el XLS trae Apellido aparte).

// Quita acentos y pasa a mayúscula: "Ñúñez" -> "NUNEZ", "Álvarez" -> "ALVAREZ"
export function normalize(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca los diacríticos combinados
    .toUpperCase()
    .trim();
}

// Devuelve la inicial (A-Z) del apellido. Si no hay letra válida, usa "X".
export function surnameInitial(lastName) {
  const clean = normalize(lastName).replace(/[^A-Z]/g, "");
  return clean.charAt(0) || "X";
}

// Año de 2 dígitos a partir de una fecha (Date, "2026-07-02" o año numérico).
export function yearTwoDigits(issueDate) {
  let year;
  if (issueDate instanceof Date) {
    year = issueDate.getFullYear();
  } else if (typeof issueDate === "number") {
    year = issueDate;
  } else if (typeof issueDate === "string" && issueDate) {
    const m = issueDate.match(/(\d{4})/);
    year = m ? parseInt(m[1], 10) : new Date().getFullYear();
  } else {
    year = new Date().getFullYear();
  }
  return String(year).slice(-2);
}

// Construye el número final a partir de las partes.
//   lastName: "González", sequence: 1, issueDate: "2026-07-02" -> "GBC-26G-0001"
export function buildCertificateNumber({ lastName, sequence, issueDate }) {
  const yy = yearTwoDigits(issueDate);
  const initial = surnameInitial(lastName);
  const seq = String(sequence).padStart(4, "0");
  return `GBC-${yy}${initial}-${seq}`;
}

// Extrae el número de secuencia de un código, sea formato viejo o nuevo.
//   "GBC-2026-00056" -> 56 ;  "GBC-26G-0001" -> 1
export function extractSequence(code) {
  if (!code) return 0;
  const m = String(code).match(/-(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

// Dado el array de códigos ya existentes, devuelve el próximo número global.
export function nextSequence(existingCodes) {
  let max = 0;
  for (const code of existingCodes || []) {
    const n = extractSequence(code);
    if (n > max) max = n;
  }
  return max + 1;
}

// Valida que un string tenga forma de certificado GovBidder (viejo o nuevo).
//   Viejo: GBC-2026-00157 ;  Nuevo: GBC-26G-0001
export function isValidCertNumber(code) {
  const c = String(code || "").trim().toUpperCase();
  const nuevo = /^GBC-\d{2}[A-Z]-\d{3,5}$/;
  const viejo = /^GBC-\d{4}-\d{4,6}$/;
  return nuevo.test(c) || viejo.test(c);
}
