export default function SaleItemsTable({ items, products, onChange, currency, disabled }) {
    const { formatMoney } = currency;

    function toNumber(value, fallback = 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function computeRow(row) {
        const soldWeight = toNumber(row.soldWeight, 0);
        const baseGoldPricePerGram = toNumber(row.baseGoldPricePerGram, 0);
        const markupPerGram = toNumber(row.markupPerGram, 0);
        const extraProfitPerGram = toNumber(row.extraProfitPerGram, 0);
        const minimumPricePerGram = baseGoldPricePerGram + markupPerGram;
        const finalPricePerGram = minimumPricePerGram + extraProfitPerGram;

        return {
            ...row,
            quantitySold: Math.max(1, Math.trunc(toNumber(row.quantitySold, 1) || 1)),
            soldWeight,
            baseGoldPricePerGram,
            markupPerGram,
            extraProfitPerGram,
            minimumPricePerGram,
            finalPricePerGram,
            baseValue: soldWeight * baseGoldPricePerGram,
            markupValue: soldWeight * markupPerGram,
            profitValue: soldWeight * extraProfitPerGram,
            lineTotal: soldWeight * finalPricePerGram,
            isBelowMinimum: finalPricePerGram < minimumPricePerGram,
        };
    }

    function newRow() {
        return computeRow({
            _rowId: crypto.randomUUID(),
            productId: "",
            productName: "",
            quantitySold: 1,
            soldWeight: "",
            baseGoldPricePerGram: "",
            markupPerGram: "",
            extraProfitPerGram: "",
        });
    }

    function addRow() {
        onChange([...items, newRow()]);
    }

    function removeRow(rowId) {
        onChange(items.filter((r) => r._rowId !== rowId));
    }

    function updateRow(rowId, field, value) {
        onChange(
            items.map((row) => {
                if (row._rowId !== rowId) return row;

                const next = { ...row, [field]: value };
                if (field === "productId") {
                    const prod = products.find((p) => p._id === value);
                    next.productName = prod?.name || "";
                    next.baseGoldPricePerGram = prod?.baseCostPerGram ?? row.baseGoldPricePerGram;
                    next.markupPerGram = prod?.markupPerGram ?? row.markupPerGram;
                }

                return computeRow(next);
            })
        );
    }

    const inputCls =
        "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm " +
        "outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50 disabled:text-slate-400";

    const thCls = "px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide";

    return (
        <div className="space-y-2">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[1200px] border-collapse text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className={thCls + " w-[20%]"}>Inventory Group</th>
                            <th className={thCls + " w-[10%]"}>Available</th>
                            <th className={thCls + " w-[8%]"}>Qty Sold</th>
                            <th className={thCls + " w-[10%]"}>Sold Weight</th>
                            <th className={thCls + " w-[10%]"}>Base / g</th>
                            <th className={thCls + " w-[10%]"}>Markup / g</th>
                            <th className={thCls + " w-[10%]"}>Extra / g</th>
                            <th className={thCls + " w-[10%]"}>Final / g</th>
                            <th className={thCls + " w-[12%] text-right"}>Line Total</th>
                            <th className={thCls + " w-[8%]"} />
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {items.length === 0 && (
                            <tr>
                                <td
                                    colSpan={10}
                                    className="py-8 text-center text-sm text-slate-400"
                                >
                                    No items yet. Click&nbsp;
                                    <span className="font-medium text-amber-700">+ Add Item</span>
                                    &nbsp;below.
                                </td>
                            </tr>
                        )}

                        {items.map((row) => {
                            const selectedProd = products.find((p) => p._id === row.productId);
                            const availableQty = selectedProd?.quantity ?? 0;
                            const availableWeight = selectedProd?.totalWeight ?? 0;
                            const quantitySold = toNumber(row.quantitySold, 0);
                            const soldWeight = toNumber(row.soldWeight, 0);
                            const qtyTooHigh = quantitySold > availableQty;
                            const weightTooHigh = soldWeight > availableWeight;

                            return (
                                <tr key={row._rowId} className="hover:bg-amber-50/40">
                                    <td className="px-3 py-2">
                                        <select
                                            value={row.productId}
                                            onChange={(e) => updateRow(row._rowId, "productId", e.target.value)}
                                            disabled={disabled}
                                            className={inputCls + (row.productId === "" ? " text-slate-400" : "")}
                                        >
                                            <option value="">Select product…</option>
                                            {products.map((p) => {
                                                return (
                                                    <option key={p._id} value={p._id}>
                                                        {p.name}
                                                        {p.quantity === 0 ? " - out of stock" : ""}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        {selectedProd && (
                                            <div className="mt-1 text-xs text-slate-400">
                                                {selectedProd.category || "General"}
                                                {selectedProd.karat ? ` · ${selectedProd.karat}` : ""}
                                                {selectedProd.averageWeightPerPiece > 0
                                                    ? ` · Avg ${selectedProd.averageWeightPerPiece.toFixed(2)} g/pc`
                                                    : ""}
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-3 py-2 text-xs text-slate-500">
                                        <div>{availableQty} pcs</div>
                                        <div>{availableWeight.toFixed(2)} g</div>
                                    </td>

                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min={1}
                                            step={1}
                                            value={row.quantitySold}
                                            onChange={(e) => updateRow(row._rowId, "quantitySold", e.target.value)}
                                            disabled={disabled}
                                            className={inputCls + (qtyTooHigh ? " border-red-400 ring-red-200" : "")}
                                        />
                                        {qtyTooHigh && (
                                            <div className="mt-0.5 text-xs text-red-500">
                                                Max {availableQty}
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={row.soldWeight}
                                            onChange={(e) => updateRow(row._rowId, "soldWeight", e.target.value)}
                                            disabled={disabled}
                                            placeholder="Exact g"
                                            className={inputCls + (weightTooHigh ? " border-red-400 ring-red-200" : "")}
                                        />
                                        {weightTooHigh && (
                                            <div className="mt-0.5 text-xs text-red-500">
                                                Max {availableWeight.toFixed(2)} g
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={row.baseGoldPricePerGram}
                                            onChange={(e) => updateRow(row._rowId, "baseGoldPricePerGram", e.target.value)}
                                            disabled={disabled}
                                            placeholder="Base"
                                            className={inputCls}
                                        />
                                    </td>

                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={row.markupPerGram}
                                            onChange={(e) => updateRow(row._rowId, "markupPerGram", e.target.value)}
                                            disabled={disabled}
                                            placeholder="Markup"
                                            className={inputCls}
                                        />
                                    </td>

                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={row.extraProfitPerGram}
                                            onChange={(e) => updateRow(row._rowId, "extraProfitPerGram", e.target.value)}
                                            disabled={disabled}
                                            placeholder="Adjustment"
                                            className={inputCls + (row.isBelowMinimum ? " border-amber-400" : "")}
                                        />
                                    </td>

                                    <td className="px-3 py-2">
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-semibold text-slate-700">
                                            {formatMoney(row.finalPricePerGram)}
                                        </div>
                                        <div className="mt-1 text-[11px] text-slate-400">
                                            Min {formatMoney(row.minimumPricePerGram)}
                                        </div>
                                    </td>

                                    <td className="px-3 py-2 text-right">
                                        <span
                                            className={
                                                "font-semibold " +
                                                (row.lineTotal > 0 ? "text-slate-800" : "text-slate-300")
                                            }
                                        >
                                            {formatMoney(row.lineTotal)}
                                        </span>
                                        <div className="mt-1 text-[11px] text-slate-400">
                                            Base {formatMoney(row.baseValue)} · Markup {formatMoney(row.markupValue)} · Extra {formatMoney(row.profitValue)}
                                        </div>
                                        {row.isBelowMinimum && (
                                            <div className="mt-1 text-[11px] font-medium text-amber-700">
                                                Warning: below minimum by {formatMoney(row.minimumPricePerGram - row.finalPricePerGram)} / g
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-3 py-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row._rowId)}
                                            disabled={disabled || items.length <= 1}
                                            className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                                            title="Remove item"
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <button
                type="button"
                onClick={addRow}
                disabled={disabled}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-amber-400 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
                <span className="text-lg leading-none">+</span> Add Item
            </button>
        </div>
    );
}
