import { useMemo, useState } from "react";
import PageHeader from "../ui/PageHeader";
import Panel from "../ui/Panel";
import Table from "../ui/Table";
import { REPORT_ROWS } from "../data/reports";
import { useCurrency } from "../store/currency.store";

// Small KPI card component used only in this page
function Kpi({ title, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function Reports() {
  const { formatMoney } = useCurrency();
  // Filter state: report type
  const [type, setType] = useState("All");

  // Filter state: date range
  // We store as strings because input type="date" returns strings.
  const [from, setFrom] = useState("2026-03-20");
  const [to, setTo] = useState("2026-03-25");

  // Filter rows by type + date range
  const rows = useMemo(() => {
    return REPORT_ROWS.filter((r) => {
      const matchType = type === "All" ? true : r.type === type;

      // Simple date compare works because format is YYYY-MM-DD
      const matchFrom = from ? r.date >= from : true;
      const matchTo = to ? r.date <= to : true;

      return matchType && matchFrom && matchTo;
    });
  }, [type, from, to]);

  // KPIs calculated from filtered rows
  const kpis = useMemo(() => {
    const totalRows = rows.length;
    const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);

    return { totalRows, totalCount, totalAmount };
  }, [rows]);

  // Table columns
  const columns = [
    { key: "date", header: "Date" },
    { key: "type", header: "Type" },
    { key: "count", header: "Count" },
    {
      key: "amount",
      header: "Amount",
      render: (r) => (r.amount ? formatMoney(r.amount) : "—"),
    },
    { key: "note", header: "Note" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Filter and export operational summaries."
        right={
          <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            Export (UI)
          </button>
        }
      />

      {/* Filters */}
      <Panel title="Filters" meta="Mock data for now">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Report Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option>All</option>
              <option>Sales</option>
              <option>Inventory</option>
              <option>Customers</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              From
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              To
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
        </div>
      </Panel>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi title="Rows" value={kpis.totalRows} sub="Matching current filters" />
        <Kpi title="Total Count" value={kpis.totalCount} sub="Sum of counts" />
        <Kpi title="Total Amount" value={formatMoney(kpis.totalAmount)} sub="Sales only rows contribute" />
      </div>

      {/* Results table */}
      <Panel title="Results" meta={`${rows.length} rows`}>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            No results for these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table columns={columns} rows={rows} rowKey={(r) => r.id} />
          </div>
        )}
      </Panel>
    </div>
  );
}
