import { google } from "googleapis";
import type { Operation, ClientSummary } from "@/types";

/**
 * Capa de integración con Google Sheets.
 *
 * IMPORTANTE — decisión de arquitectura (ver análisis previo con el usuario):
 * Postgres/Supabase es la ÚNICA fuente de verdad. Esta capa solo EXPORTA
 * (Postgres -> Sheets) para reportes compartibles. Nunca se usa para leer
 * datos que después se escriban de vuelta en la base — evita el problema
 * de fórmulas frágiles y rangos hardcodeados que se detectó en los Sheets
 * originales de los clientes.
 *
 * Credenciales: SOLO variables de entorno de servidor. Este archivo no debe
 * importarse nunca desde un componente de cliente ("use client").
 */

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error(
      "Faltan credenciales de Google (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)."
    );
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"],
  });
}

/**
 * Crea (o reutiliza) una Sheet de exportación para un cliente y escribe
 * su historial de operaciones como valores planos (sin fórmulas).
 * Devuelve la URL de la hoja.
 */
export async function exportClientSheet(params: {
  spreadsheetId: string; // hoja ya creada para este cliente
  clientName: string;
  operations: Operation[];
  summary: ClientSummary;
}): Promise<string> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const header = [
    "Fecha",
    "Tipo",
    "Activo",
    "Cantidad",
    "Precio",
    "Comisión",
    "Total",
    "Moneda",
    "Notas",
  ];

  const rows = params.operations.map((o) => [
    o.date,
    o.type,
    o.asset_ticker ?? "",
    o.quantity,
    o.price,
    o.commission,
    o.total,
    o.currency,
    o.notes ?? "",
  ]);

  const summaryRows = [
    ["Resumen de", params.clientName],
    ["Capital aportado", params.summary.capital_aportado],
    ["Retiros", params.summary.retiros],
    ["Resultado trading", params.summary.resultado_trading],
    ["Ingresos pasivos (dividendos/intereses)", params.summary.ingresos_pasivos],
    ["Comisiones pagadas", params.summary.comisiones_pagadas],
    [],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: params.spreadsheetId,
    range: "A1",
    valueInputOption: "RAW",
    requestBody: {
      values: [...summaryRows, header, ...rows],
    },
  });

  return `https://docs.google.com/spreadsheets/d/${params.spreadsheetId}/edit`;
}

/** Crea una nueva spreadsheet para un cliente que todavía no tiene una asignada. */
export async function createClientSpreadsheet(clientName: string): Promise<string> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `[Export] ${clientName}` },
    },
  });
  const id = res.data.spreadsheetId;
  if (!id) throw new Error("No se pudo crear la spreadsheet.");
  return id;
}
