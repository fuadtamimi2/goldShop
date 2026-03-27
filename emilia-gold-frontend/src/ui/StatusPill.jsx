export default function StatusPill({ value }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1";
  const map = {
    Paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Pending: "bg-amber-50 text-amber-800 ring-amber-200",
    Canceled: "bg-rose-50 text-rose-700 ring-rose-200",
    Refunded: "bg-rose-50 text-rose-700 ring-rose-200",
    Low: "bg-rose-50 text-rose-700 ring-rose-200",
    Ok: "bg-stone-100 text-stone-700 ring-stone-200",
  };
  const cls = map[value] || "bg-stone-100 text-stone-700 ring-stone-200";
  return <span className={`${base} ${cls}`}>{value}</span>;
}
