import { useEffect, useMemo, useState } from "react";
import PageHeader from "../ui/PageHeader";
import Panel from "../ui/Panel";
import {
  SPOT_USD_PER_OZ,
  TROY_OUNCE_TO_GRAM,
  USD_TO_ILS,
  USD_TO_JOD,
  KARAT_RATIO,
  PRICE_HISTORY,
} from "../data/pricing";
import { fetchSpotUsdPerOz } from "../services/pricing.service";
import { useCurrency } from "../store/currency.store";

function fmtMoney(code, n) {
  // Simple currency formatting (later can use Intl.NumberFormat)
  const symbol = code === "USD" ? "$" : code === "ILS" ? "₪" : "JD";
  return `${symbol} ${n.toFixed(2)}`;
}

export default function Pricing() {
  const { currency, setCurrency } = useCurrency();
  const [spotUsdPerOz, setSpotUsdPerOz] = useState(SPOT_USD_PER_OZ);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loadingSpot, setLoadingSpot] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSpot() {
      setLoadingSpot(true);
      try {
        const result = await fetchSpotUsdPerOz();
        if (!active) return;
        setSpotUsdPerOz(result.price);
        setUpdatedAt(result.updatedAt);
      } catch {
        if (!active) return;
        setSpotUsdPerOz(SPOT_USD_PER_OZ);
        setUpdatedAt(null);
      } finally {
        if (active) setLoadingSpot(false);
      }
    }

    loadSpot();
    return () => {
      active = false;
    };
  }, []);

  // Convert USD -> chosen currency
  const fx = useMemo(() => {
    if (currency === "USD") return 1;
    if (currency === "ILS") return USD_TO_ILS;
    return USD_TO_JOD; // JOD
  }, [currency]);

  // Spot price in chosen currency per ounce
  const spotPerOz = spotUsdPerOz * fx;

  // Price per gram for 24K in chosen currency
  const price24kPerGram = spotPerOz / TROY_OUNCE_TO_GRAM;

  // Build karat cards (24/22/21/18) with per-gram pricing
  const karatCards = useMemo(() => {
    return ["24K", "22K", "21K", "18K"].map((k) => {
      const perGram = price24kPerGram * KARAT_RATIO[k];
      return { k, perGram };
    });
  }, [price24kPerGram]);

  // Convert history into chosen currency (for display)
  const history = useMemo(() => {
    return PRICE_HISTORY.map((p) => ({
      ...p,
      value: p.usd * fx,
    }));
  }, [fx]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing"
        subtitle="Gold spot price, karat breakdown, and currency conversions."
        right={
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
          >
            <option value="USD">USD</option>
            <option value="ILS">ILS</option>
            <option value="JOD">JOD</option>
          </select>
        }
      />

      {/* Top summary cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Spot Price" meta="Per troy ounce">
          <div className="text-3xl font-semibold text-slate-900">
            {fmtMoney(currency, spotPerOz)}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Base: {fmtMoney("USD", spotUsdPerOz)} / oz
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {loadingSpot
              ? "Updating live market price..."
              : updatedAt
                ? `Live update: ${new Date(updatedAt).toLocaleString()}`
                : "Using fallback price (live source unavailable)"}
          </div>
        </Panel>

        <Panel title="24K Price" meta="Per gram">
          <div className="text-3xl font-semibold text-slate-900">
            {fmtMoney(currency, price24kPerGram)}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            (Spot / 31.103g)
          </div>
        </Panel>

        <Panel title="Exchange Rates" meta="Mock (replace later)">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">USD → ILS</span>
              <span className="font-medium text-slate-900">{USD_TO_ILS}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">USD → JOD</span>
              <span className="font-medium text-slate-900">{USD_TO_JOD}</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Karat breakdown */}
      <Panel title="Karat Breakdown" meta="Price per gram">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {karatCards.map((c) => (
            <div
              key={c.k}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="text-sm text-slate-500">{c.k}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {fmtMoney(currency, c.perGram)}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Ratio: {KARAT_RATIO[c.k].toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* History (simple list for now; chart later) */}
      <Panel title="Price History" meta="Last 6 days (mock)">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">
                  Spot ({currency})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {history.map((h) => (
                <tr key={h.date} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900">{h.date}</td>
                  <td className="px-4 py-3 text-slate-900">
                    {fmtMoney(currency, h.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
