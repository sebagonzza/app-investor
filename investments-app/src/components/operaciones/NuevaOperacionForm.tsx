"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { operationSchema, type OperationInput } from "@/lib/validations/operation";
import { useRouter } from "next/navigation";

const TYPES: { value: OperationInput["type"]; label: string }[] = [
  { value: "COMPRA", label: "Compra" },
  { value: "VENTA", label: "Venta" },
  { value: "DEPOSITO", label: "Depósito" },
  { value: "RETIRO", label: "Retiro" },
  { value: "DIVIDENDO", label: "Dividendo" },
  { value: "INTERES", label: "Interés" },
  { value: "COMISION", label: "Comisión" },
  { value: "OTRO", label: "Otro" },
];

export function NuevaOperacionForm({
  clients,
  assets,
}: {
  clients: { id: string; name: string }[];
  assets: { id: string; ticker: string }[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<OperationInput>({
    resolver: zodResolver(operationSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      type: "COMPRA",
      currency: "ARS",
      quantity: 0,
      price: 0,
      commission: 0,
    },
  });

  const type = watch("type");
  const needsAsset = ["COMPRA", "VENTA", "DIVIDENDO", "INTERES"].includes(type);
  const needsQtyPrice = ["COMPRA", "VENTA"].includes(type);

  async function onSubmit(data: OperationInput) {
    setServerError(null);
    setSuccess(false);
    const res = await fetch("/api/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "No se pudo registrar la operación.");
      return;
    }
    setSuccess(true);
    reset({
      date: new Date().toISOString().slice(0, 10),
      type: "COMPRA",
      currency: "ARS",
      quantity: 0,
      price: 0,
      commission: 0,
      client_id: data.client_id,
    });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Cliente / Cuenta</label>
          <select className="input-field" {...register("client_id")}>
            <option value="">Seleccionar...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.client_id && <p className="text-xs text-red-600 mt-1">{errors.client_id.message}</p>}
        </div>

        <div>
          <label className="label">Fecha</label>
          <input type="date" className="input-field" {...register("date")} />
          {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date.message}</p>}
        </div>

        <div>
          <label className="label">Tipo</label>
          <select className="input-field" {...register("type")}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {needsAsset && (
          <div>
            <label className="label">Activo</label>
            <select className="input-field" {...register("asset_id")}>
              <option value="">Seleccionar...</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.ticker}
                </option>
              ))}
            </select>
            {errors.asset_id && <p className="text-xs text-red-600 mt-1">{errors.asset_id.message as string}</p>}
          </div>
        )}

        {needsQtyPrice && (
          <>
            <div>
              <label className="label">Cantidad</label>
              <input type="number" step="any" className="input-field" {...register("quantity")} />
              {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="label">Precio</label>
              <input type="number" step="any" className="input-field" {...register("price")} />
              {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price.message}</p>}
            </div>
          </>
        )}

        {!needsQtyPrice && (
          <div>
            <label className="label">Monto total</label>
            <input type="number" step="any" className="input-field" {...register("total")} />
            {errors.total && <p className="text-xs text-red-600 mt-1">{errors.total.message as string}</p>}
          </div>
        )}

        <div>
          <label className="label">Moneda</label>
          <select className="input-field" {...register("currency")}>
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <div>
          <label className="label">Comisión</label>
          <input type="number" step="any" className="input-field" {...register("commission")} />
        </div>
      </div>

      <div>
        <label className="label">Notas</label>
        <textarea className="input-field" rows={2} {...register("notes")} />
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      {success && <p className="text-sm text-emerald-600">Operación registrada correctamente.</p>}

      <button type="submit" disabled={isSubmitting} className="btn-primary">
        {isSubmitting ? "Guardando..." : "Registrar operación"}
      </button>
    </form>
  );
}
