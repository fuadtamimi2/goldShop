import { useTranslation } from "react-i18next";

export default function SaleTotalsCard({ items, currency }) {
    const { formatMoney } = currency;
    const { t } = useTranslation();

    const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantitySold) || 0), 0);
    const totalWeight = items.reduce((sum, item) => sum + (Number(item.soldWeight) || 0), 0);
    const expectedMinimumTotal = items.reduce(
        (sum, item) => sum + ((Number(item.expectedProductPricePerGram ?? item.expectedMinimumSellingPricePerGram) || 0) * (Number(item.soldWeight) || 0)),
        0
    );
    const finalTotal = items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);
    const hasBelowExpected = items.some((item) => item.isBelowExpected ?? item.isBelowMinimum);

    const row = "flex items-center justify-between text-sm";
    const label = "text-slate-500";
    const value = "font-medium text-slate-800";

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                {t("sales.totals.title")}
            </div>

            <div className={row}>
                <span className={label}>{t("sales.totals.totalQty")}</span>
                <span className={value}>{totalQuantity}</span>
            </div>

            <div className={row}>
                <span className={label}>{t("sales.totals.totalWeight")}</span>
                <span className={value}>{totalWeight.toFixed(2)} g</span>
            </div>

            <div className={row}>
                <span className={label}>{t("sales.totals.expectedMinimumTotal")}</span>
                <span className={value}>{formatMoney(expectedMinimumTotal, "USD")}</span>
            </div>

            <div className="border-t border-slate-200 pt-2">
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{t("sales.totals.total")}</span>
                    <span className="text-lg font-bold text-amber-700">{formatMoney(finalTotal, "USD")}</span>
                </div>
            </div>

            {hasBelowExpected && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {t("sales.totals.belowMinWarning")}
                </div>
            )}
        </div>
    );
}
