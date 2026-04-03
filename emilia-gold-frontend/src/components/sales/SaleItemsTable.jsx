import { useTranslation } from "react-i18next";
import { useDailyPricing } from "../../store/dailyPricing.store";

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export default function SaleItemsTable({ items, products, onChange, currency, disabled }) {
    const { formatMoney, convertCurrency, currency: displayCurrency = "ILS" } = currency;
    const { t } = useTranslation();
    const { sellBasePricePerGram } = useDailyPricing();

    function computeRow(row) {
        const soldWeight = toNumber(row.soldWeight, 0);
        const sellBasePerGram = toNumber(row.sellBasePricePerGramSnapshot ?? row.minimumPricePerGram, 0);
        const productExtraPerGram = toNumber(row.productExtraPerGram ?? row.productExtraProfitPerGram, 0);
        const expectedProductPricePerGram = sellBasePerGram + productExtraPerGram;
        // Canonical internal money unit is USD.
        const actualSoldPricePerGram = toNumber(row.actualSoldPricePerGram ?? row.actualSalePricePerGram, 0);

        return {
            ...row,
            quantitySold: Math.max(1, Math.trunc(toNumber(row.quantitySold, 1) || 1)),
            soldWeight,
            sellBasePricePerGramSnapshot: sellBasePerGram,
            productExtraPerGram,
            expectedProductPricePerGram,
            actualSoldPricePerGram,
            lineTotal: soldWeight * actualSoldPricePerGram,
            lineProfit: soldWeight * (actualSoldPricePerGram - expectedProductPricePerGram),
            isBelowExpected: actualSoldPricePerGram < expectedProductPricePerGram,
            // Keep legacy fields synced for older data paths.
            minimumPricePerGram: sellBasePerGram,
            productExtraProfitPerGram: productExtraPerGram,
            expectedMinimumSellingPricePerGram: expectedProductPricePerGram,
            actualSalePricePerGram: actualSoldPricePerGram,
            isBelowMinimum: actualSoldPricePerGram < expectedProductPricePerGram,
        };
    }

    function newRow() {
        return computeRow({
            _rowId: crypto.randomUUID(),
            productId: "",
            productName: "",
            quantitySold: 1,
            soldWeight: "",
            sellBasePricePerGramSnapshot: 0,
            productExtraPerGram: 0,
            actualSoldPricePerGram: "",
        });
    }

    function addRow() {
        onChange([...(items || []), newRow()]);
    }

    function removeRow(rowId) {
        onChange((items || []).filter((r) => r._rowId !== rowId));
    }

    function updateRow(rowId, field, value) {
        onChange(
            (items || []).map((row) => {
                if (row._rowId !== rowId) return row;

                const nextRow = { ...row, [field]: value };

                if (field === "productId") {
                    const prod = products.find((p) => p._id === value);
                    const sellBase = sellBasePricePerGram(prod?.karat);
                    const productExtra = toNumber(prod?.extraProfitPerGram ?? prod?.markupPerGram, 0);
                    const expected = sellBase + productExtra;

                    nextRow.productName = prod?.name || "";
                    nextRow.sellBasePricePerGramSnapshot = sellBase;
                    nextRow.productExtraPerGram = productExtra;
                    nextRow.expectedProductPricePerGram = expected;
                    if (!nextRow.actualSoldPricePerGram && !nextRow.actualSalePricePerGram) {
                        nextRow.actualSoldPricePerGram = expected;
                    }
                }

                return computeRow(nextRow);
            })
        );
    }

    const inputCls =
        "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm " +
        "outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50 disabled:text-slate-400";

    const readOnlyCls =
        "w-full rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-sm text-slate-700 font-medium";

    const thCls = "px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap";

    return (
        <div className="space-y-2">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[1100px] border-collapse text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className={thCls + " w-[20%]"}>{t("sales.items.inventoryGroup")}</th>
                            <th className={thCls + " w-[9%]"}>{t("sales.items.available")}</th>
                            <th className={thCls + " w-[7%]"}>{t("sales.items.qtySold")}</th>
                            <th className={thCls + " w-[9%]"}>{t("sales.items.soldWeight")}</th>
                            <th className={thCls + " w-[10%]"}>{t("sales.items.sellBasePerG")}</th>
                            <th className={thCls + " w-[9%]"}>{t("sales.items.productExtraPerG")}</th>
                            <th className={thCls + " w-[10%]"}>{t("sales.items.expectedPerG")}</th>
                            <th className={thCls + " w-[11%]"}>{t("sales.items.actualPricePerG")}</th>
                            <th className={thCls + " w-[10%] text-right"}>{t("sales.items.lineTotal")}</th>
                            <th className={thCls + " w-[5%]"} />
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {(items || []).length === 0 && (
                            <tr>
                                <td colSpan={10} className="py-8 text-center text-sm text-slate-400">
                                    {t("sales.items.noItems")}
                                </td>
                            </tr>
                        )}

                        {(items || []).map((row) => {
                            const selectedProd = products.find((p) => p._id === row.productId);
                            const availableQty = selectedProd?.quantity ?? 0;
                            const availableWeight = selectedProd?.totalWeight ?? 0;
                            const quantitySold = toNumber(row.quantitySold, 0);
                            const soldWeight = toNumber(row.soldWeight, 0);
                            const qtyTooHigh = quantitySold > availableQty;
                            const weightTooHigh = soldWeight > availableWeight;
                            const expectedPerG = row.expectedProductPricePerGram ?? row.expectedMinimumSellingPricePerGram ?? 0;
                            const actualPerGUsd = toNumber(
                                row.actualSoldPricePerGram ?? row.actualSalePricePerGram,
                                0
                            );
                            const actualPerGDisplay = convertCurrency(actualPerGUsd, "USD", displayCurrency);
                            const isBelowExpected = row.isBelowExpected ?? row.isBelowMinimum;

                            return (
                                <tr key={row._rowId} className="hover:bg-amber-50/40">
                                    <td className="px-3 py-2">
                                        <select
                                            value={row.productId}
                                            onChange={(e) => updateRow(row._rowId, "productId", e.target.value)}
                                            disabled={disabled}
                                            className={inputCls + (row.productId === "" ? " text-slate-400" : "")}
                                        >
                                            <option value="">{t("sales.items.selectProduct")}</option>
                                            {products.map((p) => (
                                                <option key={p._id} value={p._id}>
                                                    {p.name}
                                                    {p.quantity === 0 ? ` - ${t("sales.items.outOfStock")}` : ""}
                                                </option>
                                            ))}
                                        </select>
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
                                            className={inputCls + (qtyTooHigh ? " border-red-400" : "")}
                                        />
                                        {qtyTooHigh && (
                                            <div className="mt-0.5 text-xs text-red-500">
                                                {t("sales.items.maxQty", { qty: availableQty })}
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
                                            placeholder={t("sales.items.exactG")}
                                            className={inputCls + (weightTooHigh ? " border-red-400" : "")}
                                        />
                                        {weightTooHigh && (
                                            <div className="mt-0.5 text-xs text-red-500">
                                                {t("sales.items.maxQty", { qty: availableWeight.toFixed(2) + " g" })}
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-3 py-2">
                                        <div className={readOnlyCls}>
                                            {formatMoney(row.sellBasePricePerGramSnapshot ?? row.minimumPricePerGram ?? 0, "USD")}
                                        </div>
                                    </td>

                                    <td className="px-3 py-2">
                                        <div className={readOnlyCls}>
                                            {formatMoney(row.productExtraPerGram ?? row.productExtraProfitPerGram ?? 0, "USD")}
                                        </div>
                                    </td>

                                    <td className="px-3 py-2">
                                        <div className={readOnlyCls + " text-amber-700"}>{formatMoney(expectedPerG, "USD")}</div>
                                    </td>

                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={Number.isFinite(actualPerGDisplay) ? actualPerGDisplay : ""}
                                            onChange={(e) => {
                                                const enteredDisplay = toNumber(e.target.value, 0);
                                                const enteredUsd = convertCurrency(enteredDisplay, displayCurrency, "USD");
                                                updateRow(row._rowId, "actualSoldPricePerGram", enteredUsd);
                                            }}
                                            disabled={disabled}
                                            placeholder={t("sales.items.salePrice")}
                                            className={inputCls + (isBelowExpected ? " border-amber-400" : "")}
                                        />
                                        {isBelowExpected && (
                                            <div className="mt-1 text-[11px] font-medium text-amber-700">
                                                {t("sales.items.belowMinWarning", {
                                                    amount: formatMoney(expectedPerG - actualPerGUsd, "USD"),
                                                })}
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-3 py-2 text-right">
                                        <span className={"font-semibold " + (row.lineTotal > 0 ? "text-slate-800" : "text-slate-300")}>
                                            {formatMoney(row.lineTotal, "USD")}
                                        </span>
                                    </td>

                                    <td className="px-3 py-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row._rowId)}
                                            disabled={disabled || (items || []).length <= 1}
                                            className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                                            title="Remove item"
                                        >
                                            X
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
                <span className="text-lg leading-none">+</span>
                {t("sales.items.addItem")}
            </button>
        </div>
    );
}
