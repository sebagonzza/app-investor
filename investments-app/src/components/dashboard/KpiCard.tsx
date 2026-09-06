import clsx from "clsx";

export function KpiCard({
  label,
  value,
  hint,
  positive,
}: {
  label: string;
  value: string;
  hint?: string;
  positive?: boolean;
}) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p
        className={clsx(
          "text-2xl font-semibold mt-1",
          positive === true && "text-emerald-600",
          positive === false && "text-red-600"
        )}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
