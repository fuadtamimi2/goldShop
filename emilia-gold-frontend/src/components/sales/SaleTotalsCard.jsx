export default function SaleTotalsCard({ items, currency }) {
    const { formatMoney } = currency;

    const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantitySold) || 0), 0);
    const totalWeight = items.reduce((sum, item) => sum + (Number(item.soldWeight) || 0), 0);
    const totalBaseValue = items.reduce((sum, item) => sum + (Number(item.baseValue) || 0), 0);
    const totalMarkupValue = items.reduce((sum, item) => sum + (Number(item.markupValue) || 0), 0);
    const totalProfitValue = items.reduce((sum, item) => sum + (Number(item.profitValue) || 0), 0);
    const finalTotal = items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);
    const hasBelowMinimum = items.some((item) => item.isBelowMinimum);

    const row = "flex items-center justify-between text-sm";
    const label = "text-slate-500";
    const value = "font-medium text-slate-800";

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Sale Summary
            </div>

            <div className={row}>
                <span className={label}>Total quantity</span>
                <span className={value}>{totalQuantity}</span>
            </div>

            <div className={row}>
                <span className={label}>Total weight</span>
                <span className={value}>{totalWeight.toFixed(2)} g</span>
            </div>

            <div className={row}>
                <span className={label}>Base value</span>
                <span className={value}>{formatMoney(totalBaseValue)}</span>
            </div>

            <div className={row}>
                <span className={label}>Markup value</span>
                <span className={value}>{formatMoney(totalMarkupValue)}</span>
            </div>

            <div className={row}>
                <span className={label}>Extra profit value</span>
                <span className={value}>{formatMoney(totalProfitValue)}</span>
            </div>

            <div className="border-t border-slate-200 pt-2">
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Total</span>
                    <span className="text-lg font-bold text-amber-700">{formatMoney(finalTotal)}</span>
                </div>
            </div>

            {hasBelowMinimum && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    One or more lines are below the expected minimum price of base gold plus markup.
                </div>
            )}
        </div>
    );
}
