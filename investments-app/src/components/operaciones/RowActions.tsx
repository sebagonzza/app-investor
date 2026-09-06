"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function RowActions({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/operations/${id}`, { method: "DELETE" });
    setLoading(false);
    setConfirming(false);
    if (res.ok) router.refresh();
  }

  if (confirming) {
    return (
      <span className="text-xs inline-flex items-center gap-2">
        ¿Eliminar?
        <button onClick={handleDelete} disabled={loading} className="text-red-600 font-medium">
          Sí
        </button>
        <button onClick={() => setConfirming(false)} className="text-gray-500">
          No
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-gray-400 hover:text-red-600"
      title="Eliminar operación"
    >
      <Trash2 size={16} />
    </button>
  );
}
