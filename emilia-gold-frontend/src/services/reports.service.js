import salesSeed from "../data/reports"; // אם יש לך reports.js; אחרת תחבר ל-sales data שלך

export function filterReports({ type, from, to }) {
  const rows = Array.isArray(salesSeed) ? salesSeed : [];
  const fromD = new Date(from);
  const toD = new Date(to);

  const filtered = rows.filter((r) => {
    const d = new Date(r.date);
    const inRange = d >= fromD && d <= toD;
    const typeOk = !type || type === "All" || r.type === type;
    return inRange && typeOk;
  });

  const totalCount = filtered.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
  const totalAmount = filtered.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return {
    filtered,
    kpis: {
      rows: filtered.length,
      totalCount,
      totalAmount,
    },
  };
}
