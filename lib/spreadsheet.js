// Lectura de Excel (.xlsx) y CSV para las cargas masivas del admin.
// Reemplaza a "xlsx" (SheetJS), que tiene vulnerabilidades sin parche en npm.
// Devuelve un array de objetos { encabezado: valor } con todos los valores como texto,
// igual que hacía XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false }).
import { readSheet } from "read-excel-file/node";

function cellToText(v) {
  if (v == null) return "";
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "";
    return v.toISOString().slice(0, 10); // YYYY-MM-DD
  }
  return String(v).trim();
}

function rowsToObjects(matrix) {
  const rows = (matrix || []).filter((r) => r && r.some((c) => cellToText(c) !== ""));
  if (!rows.length) return [];
  const headers = rows[0].map((h) => cellToText(h));
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = cellToText(r[i]);
    });
    return obj;
  });
}

// CSV simple: respeta comillas, comillas dobles escapadas y saltos de línea dentro de comillas.
// Detecta el separador (coma o punto y coma) mirando la primera línea.
function parseCsv(text) {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] || "";
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  const out = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === sep) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      out.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    out.push(row);
  }
  return out;
}

export async function readSpreadsheetRows(buf, fileName) {
  const name = (fileName || "").toLowerCase();
  if (name.endsWith(".csv")) {
    return rowsToObjects(parseCsv(buf.toString("utf8")));
  }
  if (name.endsWith(".xls")) {
    throw new Error("El formato .xls (Excel 97-2003) ya no se acepta. Guárdalo como .xlsx o .csv.");
  }
  return rowsToObjects(await readSheet(buf));
}
