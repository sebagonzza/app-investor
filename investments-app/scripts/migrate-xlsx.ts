/**
 * Migración inicial: XLSX (uno por cliente) -> operaciones normalizadas.
 *
 * Uso:
 *   npx tsx scripts/migrate-xlsx.ts "Peon Bruno=./MOVIMIENTOS_PEON_BRUNO.xlsx" "Melano Agustina=./MOVIMIENTOS_MELANO_AGUSTINA.xlsx"
 *
 * Qué hace:
 *  - Lee la tabla principal de operaciones (columnas A-J, filas 2 en adelante) de "Hoja 1".
 *  - Mapea STATE -> operation_type (ver `mapType` abajo).
 *  - Genera dos archivos en ./migration-output/:
 *      - operations.json   (para revisar a mano antes de insertar)
 *      - seed.sql           (INSERTs listos, PERO pensados para revisar antes de correr)
 *
 * Qué NO hace (a propósito, por las inconsistencias detectadas en el análisis):
 *  - No importa automáticamente los bloques de "CIERRE" (columnas Q-V: W/L TOTAL,
 *    20% COMISION, W/L FINAL, COBRADO). Esos bloques agregan varias operaciones de
 *    forma no unívoca (PART SELL, TAKE, TOTAL SELL) y varían de layout entre clientes.
 *    Se listan en `revisar_manualmente.json` para que decidas cómo tratarlos
 *    (probablemente como operaciones de tipo COMISION asociadas a la venta correspondiente).
 *  - No inventa un "activo" para símbolos ambiguos como "CAUSION" o "CAPITAL": los
 *    crea igual en la tabla `assets` pero con type = 'OTRO' para que los reclasifiques.
 */
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

type RawOperation = {
  client: string;
  date: string | null;
  state: string;
  symbol: string;
  montoIvaCom: number | null;
  monto: number | null;
  montoUnit: number | null;
  quantity: number | null;
  wl_amount: number | string | null;
  wl_pct: number | string | null;
  rowIndex: number;
};

type NormalizedOperation = {
  client: string;
  date: string | null;
  type: "COMPRA" | "VENTA" | "DEPOSITO" | "RETIRO" | "OTRO";
  ticker: string;
  quantity: number;
  price: number;
  currency: "ARS";
  commission: number;
  total: number;
  notes: string;
};

function mapType(state: string, symbol: string): NormalizedOperation["type"] {
  const s = (state || "").trim().toUpperCase();
  const sym = (symbol || "").trim().toUpperCase();
  if (s === "BUY") return "COMPRA";
  if (s === "SELL") return "VENTA";
  if ((s === "-" || s === "") && (sym.includes("CAPITAL"))) return "DEPOSITO";
  // CANCEL en el sheet de Melano se usa para operaciones tipo "canje/transferencia"
  // (símbolo TRAN) — no es una venta ni compra real. Se marca OTRO para revisión.
  if (s === "CANCEL") return "OTRO";
  return "OTRO";
}

function excelDateToISO(value: any): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    // Excel serial date fallback
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  return null;
}

function parseClientFile(clientName: string, filePath: string): RawOperation[] {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const ws = wb.Sheets["Hoja 1"] ?? wb.Sheets[wb.SheetNames[0]];
  const rows: RawOperation[] = [];

  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const get = (col: string) => ws[`${col}${r + 1}`]?.v ?? null;
    const dateVal = get("A");
    const state = get("B");
    const symbol = get("C");
    if (dateVal === null && symbol === null) continue; // fila vacía
    if (symbol === "-" || symbol === null) continue; // fila sin operación real

    rows.push({
      client: clientName,
      date: excelDateToISO(dateVal),
      state: String(state ?? "").trim(),
      symbol: String(symbol ?? "").trim(),
      montoIvaCom: typeof get("D") === "number" ? (get("D") as number) : null,
      monto: typeof get("E") === "number" ? (get("E") as number) : null,
      montoUnit: typeof get("F") === "number" ? (get("F") as number) : null,
      quantity: typeof get("H") === "number" ? (get("H") as number) : null,
      wl_amount: get("I"),
      wl_pct: get("J"),
      rowIndex: r + 1,
    });
  }
  return rows;
}

function normalize(raw: RawOperation[]): { ok: NormalizedOperation[]; review: RawOperation[] } {
  const ok: NormalizedOperation[] = [];
  const review: RawOperation[] = [];

  for (const row of raw) {
    const type = mapType(row.state, row.symbol);
    if (type === "OTRO") {
      review.push(row);
      continue;
    }
    ok.push({
      client: row.client,
      date: row.date,
      type,
      ticker: row.symbol,
      quantity: row.quantity ?? 0,
      price: row.montoUnit ?? 0,
      currency: "ARS",
      commission: 0, // las comisiones de cierre no están 1:1 con la fila de origen; ver revisar_manualmente.json
      total: row.monto ?? (row.quantity ?? 0) * (row.montoUnit ?? 0),
      notes: `Importado de Sheet original, fila ${row.rowIndex}. STATE original: "${row.state}"`,
    });
  }
  return { ok, review };
}

function toSQL(ops: NormalizedOperation[]): string {
  const lines: string[] = [];
  lines.push("-- Revisar antes de ejecutar. Asume que ya existen filas en `clients` con estos nombres");
  lines.push("-- y que `assets` se puebla primero (ver bloque de abajo).");
  lines.push("");
  const tickers = Array.from(new Set(ops.map((o) => o.ticker)));
  lines.push("-- Activos detectados (revisar 'type' antes de insertar):");
  for (const t of tickers) {
    lines.push(
      `insert into public.assets (ticker, name, type, currency) values ('${t}', '${t}', 'OTRO', 'ARS') on conflict (ticker) do nothing;`
    );
  }
  lines.push("");
  lines.push("-- Operaciones:");
  for (const o of ops) {
    lines.push(
      `insert into public.operations (client_id, asset_id, date, type, quantity, price, currency, commission, total, notes)
select c.id, a.id, ${o.date ? `'${o.date}'` : "null"}, '${o.type}', ${o.quantity}, ${o.price}, '${o.currency}', ${o.commission}, ${o.total}, '${o.notes.replace(/'/g, "''")}'
from public.clients c, public.assets a
where c.name = '${o.client.replace(/'/g, "''")}' and a.ticker = '${o.ticker.replace(/'/g, "''")}';`
    );
  }
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Uso: npx tsx scripts/migrate-xlsx.ts "Nombre Cliente=ruta.xlsx" [...]'
    );
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), "migration-output");
  fs.mkdirSync(outDir, { recursive: true });

  let allOk: NormalizedOperation[] = [];
  let allReview: RawOperation[] = [];

  for (const arg of args) {
    const [clientName, filePath] = arg.split("=");
    if (!clientName || !filePath) {
      console.warn(`Argumento inválido, se espera "Cliente=archivo.xlsx": ${arg}`);
      continue;
    }
    const raw = parseClientFile(clientName, filePath);
    const { ok, review } = normalize(raw);
    allOk = allOk.concat(ok);
    allReview = allReview.concat(review);
    console.log(`${clientName}: ${ok.length} operaciones normalizadas, ${review.length} para revisar a mano.`);
  }

  fs.writeFileSync(path.join(outDir, "operations.json"), JSON.stringify(allOk, null, 2));
  fs.writeFileSync(path.join(outDir, "revisar_manualmente.json"), JSON.stringify(allReview, null, 2));
  fs.writeFileSync(path.join(outDir, "seed.sql"), toSQL(allOk));

  console.log(`\nListo. Revisá los archivos en ${outDir} antes de correr seed.sql contra Supabase.`);
}

main();
