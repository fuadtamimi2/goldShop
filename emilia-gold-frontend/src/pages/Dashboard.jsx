import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Panel from "../ui/Panel";
import { SALES_TRANSACTIONS } from "../data/sales";
import { INVENTORY } from "../data/inventory";
import { useCurrency } from "../store/currency.store";

function Card({ title, value, sub, badge }) {
  return (
    <div className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_10px_24px_-20px_rgba(70,42,10,0.5)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-[var(--text-muted)]">{title}</div>
        {badge && (
          <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-strong)]">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{value}</div>
      {sub && <div className="mt-1 text-xs text-[var(--text-muted)]">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { formatMoney } = useCurrency();
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const paidSales = useMemo(
    () => SALES_TRANSACTIONS.filter((tx) => tx.status === "Paid"),
    []
  );

  const todaySales = paidSales.filter((tx) => tx.date === today);
  const yesterdaySales = paidSales.filter((tx) => tx.date === yesterday);

  const todayRevenue = todaySales.reduce((sum, tx) => sum + tx.amount, 0);
  const yesterdayRevenue = yesterdaySales.reduce((sum, tx) => sum + tx.amount, 0);
  const todayTransactions = todaySales.length;
  const totalGoldSold = paidSales.reduce((sum, tx) => sum + tx.grams, 0);
  const avgTicket = todayTransactions ? Math.round(todayRevenue / todayTransactions) : 0;

  const lowStock = INVENTORY.filter((i) => i.qty <= 2).length;

  const changePct =
    yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : 0;

  const dailyTrend = ["2026-03-21", "2026-03-22", "2026-03-23", "2026-03-24", "2026-03-25"].map(
    (date) => {
      const total = paidSales
        .filter((s) => s.date === date)
        .reduce((sum, s) => sum + s.amount, 0);
      return { date: date.slice(5), total };
    }
  );

  const maxTrend = Math.max(...dailyTrend.map((d) => d.total), 1);

  const topProducts = [...paidSales]
    .reduce((map, tx) => {
      const current = map.get(tx.product) || { product: tx.product, revenue: 0, count: 0 };
      current.revenue += tx.amount;
      current.count += 1;
      map.set(tx.product, current);
      return map;
    }, new Map())
    .values();

  const topList = Array.from(topProducts)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const kpis = [
    {
      title: t("dashboard.kpis.todayRevenue"),
      value: formatMoney(todayRevenue),
      sub: t("dashboard.kpis.vsYesterday", { change: `${changePct >= 0 ? "+" : ""}${changePct}` }),
      badge: t("dashboard.kpis.todayBadge"),
    },
    { title: t("dashboard.kpis.transactions"), value: todayTransactions, sub: t("dashboard.kpis.transactionsSub") },
    { title: t("dashboard.kpis.goldSold"), value: `${totalGoldSold.toFixed(1)} g`, sub: t("dashboard.kpis.goldSoldSub") },
    { title: t("dashboard.kpis.avgTicket"), value: formatMoney(avgTicket), sub: t("dashboard.kpis.lowStockAlerts", { count: lowStock }) },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-[var(--text)]">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {t("dashboard.subtitle")}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.title} {...k} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title={t("dashboard.salesOverTime")} meta={t("dashboard.last5Days")}>
          <div className="flex h-64 items-end gap-3 rounded-2xl bg-[var(--panel-soft)] p-4">
            {dailyTrend.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-2">
                <div
                  className="w-full rounded-t-xl bg-[var(--brand)]/85"
                  style={{ height: `${Math.max((d.total / maxTrend) * 170, 12)}px` }}
                  title={`${d.date}: ${formatMoney(d.total)}`}
                />
                <div className="text-xs text-[var(--text-muted)]">{d.date}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={t("dashboard.topProducts")} meta={t("dashboard.byPaidRevenue")}>
          <div className="space-y-3">
            {topList.map((p, idx) => (
              <div key={p.product} className="flex items-center justify-between rounded-2xl bg-[var(--panel-soft)] px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">{idx + 1}. {p.product}</div>
                  <div className="text-xs text-[var(--text-muted)]">{t("dashboard.sales", { count: p.count })}</div>
                </div>
                <div className="text-sm font-semibold text-[var(--brand-strong)]">{formatMoney(p.revenue)}</div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}
