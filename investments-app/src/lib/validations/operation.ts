import { z } from "zod";

export const operationTypeEnum = z.enum([
  "COMPRA",
  "VENTA",
  "DEPOSITO",
  "RETIRO",
  "DIVIDENDO",
  "INTERES",
  "COMISION",
  "OTRO",
]);

// Reglas: quantity/price obligatorios y > 0 para COMPRA/VENTA.
// Para DEPOSITO/RETIRO no se requiere activo ni cantidad, solo "total".
// Base object (sin refine) para poder usar `.partial()` en actualizaciones parciales (PATCH).
export const operationBaseSchema = z.object({
  client_id: z.string().uuid({ message: "Seleccioná un cliente." }),
  asset_id: z.string().uuid().nullable().optional(),
  date: z.string().min(1, "La fecha es obligatoria."),
  type: operationTypeEnum,
  quantity: z.coerce.number().min(0).default(0),
  price: z.coerce.number().min(0).default(0),
  currency: z.string().min(1).default("ARS"),
  commission: z.coerce.number().min(0).default(0),
  total: z.coerce.number().optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const operationSchema = operationBaseSchema.superRefine((data, ctx) => {
    const needsAsset = ["COMPRA", "VENTA", "DIVIDENDO", "INTERES"].includes(data.type);
    if (needsAsset && !data.asset_id) {
      ctx.addIssue({
        code: "custom",
        path: ["asset_id"],
        message: "Este tipo de operación requiere un activo.",
      });
    }
    if (["COMPRA", "VENTA"].includes(data.type)) {
      if (data.quantity <= 0) {
        ctx.addIssue({ code: "custom", path: ["quantity"], message: "La cantidad debe ser mayor a 0." });
      }
      if (data.price <= 0) {
        ctx.addIssue({ code: "custom", path: ["price"], message: "El precio debe ser mayor a 0." });
      }
    }
    if (["DEPOSITO", "RETIRO"].includes(data.type) && (!data.total || data.total <= 0)) {
      ctx.addIssue({ code: "custom", path: ["total"], message: "El monto debe ser mayor a 0." });
    }
  });

export type OperationInput = z.infer<typeof operationSchema>;

/** Calcula el total en base al tipo, si no vino explícito. */
export function computeTotal(input: OperationInput): number {
  if (input.total && input.total > 0) return input.total;
  if (input.type === "COMPRA") return input.quantity * input.price + input.commission;
  if (input.type === "VENTA") return input.quantity * input.price - input.commission;
  return input.quantity * input.price;
}
