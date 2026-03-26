import { useEffect, useState } from "react";
import { subscribeToasts } from "./toast";

export default function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    return subscribeToasts((t) => {
      const id = crypto.randomUUID();
      const toast = { id, type: t.type || "info", title: t.title || "", message: t.message || "" };
      setItems((prev) => [...prev, toast].slice(-4));
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), t.duration || 2500);
    });
  }, []);

  const typeClass = (type) => {
    if (type === "success") return "border-green-200 bg-green-50 text-green-900";
    if (type === "error") return "border-red-200 bg-red-50 text-red-900";
    if (type === "warning") return "border-yellow-200 bg-yellow-50 text-yellow-900";
    return "border-slate-200 bg-white text-slate-900";
  };

  return (
    <>
      {children}
      <div className="fixed right-4 top-4 z-[9999] flex w-[320px] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={`rounded-xl border px-4 py-3 shadow-sm ${typeClass(t.type)}`}>
            {t.title ? <div className="text-sm font-semibold">{t.title}</div> : null}
            {t.message ? <div className="text-sm opacity-90">{t.message}</div> : null}
          </div>
        ))}
      </div>
    </>
  );
}
