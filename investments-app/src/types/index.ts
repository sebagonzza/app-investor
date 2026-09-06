export type UserRole = "ADMIN" | "MANAGER" | "VIEWER";
export type ClientType = "PROPIO" | "TERCERO";
export type OperationType =
  | "COMPRA"
  | "VENTA"
  | "DEPOSITO"
  | "RETIRO"
  | "DIVIDENDO"
  | "INTERES"
  | "COMISION"
  | "OTRO";

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: "ACTIVO" | "INACTIVO";
  created_at: string;
}

export interface Asset {
  id: string;
  ticker: string;
  name: string | null;
  type: string | null;
  sector: string | null;
  currency: string;
  created_at: string;
}

export interface Operation {
  id: string;
  client_id: string;
  asset_id: string | null;
  date: string;
  type: OperationType;
  quantity: number;
  price: number;
  currency: string;
  commission: number;
  total: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // joins opcionales
  client_name?: string;
  asset_ticker?: string;
}

export interface ClientSummary {
  client_id: string;
  name: string;
  type: ClientType;
  capital_aportado: number;
  retiros: number;
  ingresos_pasivos: number;
  comisiones_pagadas: number;
  resultado_trading: number;
}

export interface Position {
  client_id: string;
  asset_id: string;
  ticker: string;
  asset_name: string | null;
  currency: string;
  quantity: number;
  avg_price: number;
}
