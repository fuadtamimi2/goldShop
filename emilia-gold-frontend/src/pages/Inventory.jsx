import { useMemo, useState } from "react";
import PageHeader from "../ui/PageHeader";
import Panel from "../ui/Panel";
import Table from "../ui/Table";
import StatusPill from "../ui/StatusPill";
import { INVENTORY } from "../data/inventory";

export default function Inventory() {
  // Search text state (what user types)
  const [q, setQ] = useState("");

  // Category filter state
  const [category, setCategory] = useState("All");

  // “Low stock threshold”: qty <= 2 is considered low
  const LOW_LIMIT = 2;

  // Compute the list of categories from the data (unique values)
  const categories = useMemo(() => {
    const set = new Set(INVENTORY.map((i) => i.category));
    return ["All", ...Array.from(set)];
  }, []);

  // Filter the rows based on q + category
  const rows = useMemo(() => {
    return INVENTORY.filter((item) => {
      const matchText =
        item.id.toLowerCase().includes(q.toLowerCase()) ||
        item.name.toLowerCase().includes(q.toLowerCase());

      const matchCategory = category === "All" ? true : item.category === category;

      return matchText && matchCategory;
    });
  }, [q, category]);

  // Table column definitions (key = column id, header = title)
  const columns = [
    { key: "id", header: "SKU" },
    { key: "name", header: "Product" },
    { key: "category", header: "Category" },
    { key: "karat", header: "Karat" },
    {
      key: "weight_g",
      header: "Weight",
      render: (r) => `${r.weight_g} g`,
    },
    { key: "qty", header: "Qty" },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        if (r.qty === 0) return <StatusPill value="Low" />;      // out of stock
        if (r.qty <= LOW_LIMIT) return <StatusPill value="Low" />; // low stock
        return <StatusPill value="Ok" />;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Manage products, stock levels and availability."
        right={
          <button className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800">
            + Add Item
          </button>
        }
      />

      <Panel>
        {/* Filters row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            {/* Search input */}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by SKU or product..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />

            {/* Category select */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Result counter */}
          <div className="text-sm text-slate-500">{rows.length} items</div>
        </div>

        {/* Table or empty state */}
        <div className="mt-4">
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
              No items found. Try changing filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table columns={columns} rows={rows} rowKey={(r) => r.id} />
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
