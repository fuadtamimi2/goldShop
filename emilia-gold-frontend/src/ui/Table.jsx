export default function Table({ columns, rows, rowKey }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--panel-soft)] text-[var(--text-muted)]">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 text-left font-semibold">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--line)] bg-[var(--panel)]">
          {rows.map((r) => (
            <tr key={rowKey(r)} className="transition hover:bg-[var(--panel-soft)]/70">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-[var(--text)]">
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
