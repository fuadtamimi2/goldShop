import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Panel from "../ui/Panel";
import { listSales } from "../services/sales.service";
import { listGoldPurchases } from "../services/goldPurchases.service";
import { listProducts } from "../services/products.service";
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

/** Return start-of-day and end-of-day Date objects for the local calendar date `d`. */
function dayRange(d) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function isInDay(dateValue, { start, end }) {
  const d = new Date(dateValue);
  return d >= start && d <= end;
}

export default function Dashboard() {
  const { formatMoney } = useCurrency();
  const { t } = useTranslation();

  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    listSales().then(setSales).catch(() => setSales([]));
    listGoldPurchases().then(setPurchases).catch(() => setPurchases([]));
    listProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  const now = new Date();
  const todayRange = useMemo(() => dayRange(now), []);
  const yesterdayRange = useMemo(() => dayRange(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)), []);

  const paidSales = useMemo(() => sales.filter((s) => s.paymentStatus === "Paid"), [sales]);

  const todaySales = useMemo(() => paidSales.filter((s) => isInDay(s.date, todayRange)), [paidSales, todayRange]);
  const yesterdaySales = useMemo(() => paidSales.filter((s) => isInDay(s.date, yesterdayRange)), [paidSales, yesterdayRange]);

  const todayRevenue = todaySales.reduce((sum, s) => sum + (s.finalTotal || 0), 0);
  const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + (s.finalTotal || 0), 0);
  const todayTransactions = todaySales.length;
  const totalGoldSold = paidSales.reduce((sum, s) => sum + (s.totalWeight || 0), 0);
  const avgTicket = todayTransactions ? todayRevenue / todayTransactions : 0;

  const lowStock = products.filter((p) => (p.quantity ?? 0) <= 2).length;

  const changePct =
    yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : 0;

  const dailyTrend = useMemo(() => {
    const days = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push(d);
    }
    return days.map((d) => {
      const range = dayRange(d);
      const total = paidSales
        .filter((s) => isInDay(s.date, range))
        .reduce((sum, s) => sum + (s.finalTotal || 0), 0);
      const label = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { date: label, total };
    });
  }, [paidSales]);

  const maxTrend = Math.max(...dailyTrend.map((d) => d.total), 1);

  const topList = useMemo(() => {
    const map = new Map();
    for (const sale of paidSales) {
      for (const item of sale.items || []) {
        const name = item.productName || "Unknown";
        const cur = map.get(name) || { product: name, revenue: 0, count: 0 };
        cur.revenue += item.lineTotal || 0;
        cur.count += 1;
        map.set(name, cur);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [paidSales]);

  const kpis = [
    {
      title: t("dashboard.kpis.todayRevenue"),
      value: formatMoney(todayRevenue, "USD"),
      sub: t("dashboard.kpis.vsYesterday", { change: `${changePct >= 0 ? "+" : ""}${changePct}` }),
      badge: t("dashboard.kpis.todayBadge"),
    },
    { title: t("dashboard.kpis.transactions"), value: todayTransactions, sub: t("dashboard.kpis.transactionsSub") },
    { title: t("dashboard.kpis.goldSold"), value: `${totalGoldSold.toFixed(1)} g`, sub: t("dashboard.kpis.goldSoldSub") },
    { title: t("dashboard.kpis.avgTicket"), value: formatMoney(avgTicket, "USD"), sub: t("dashboard.kpis.lowStockAlerts", { count: lowStock }) },
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
                  title={`${d.date}: ${formatMoney(d.total, "USD")}`}
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
                <div className="text-sm font-semibold text-[var(--brand-strong)]">{formatMoney(p.revenue, "USD")}</div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}
