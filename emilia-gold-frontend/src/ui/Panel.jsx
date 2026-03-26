export default function Panel({ title, meta, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_10px_24px_-20px_rgba(70,42,10,0.5)] ${className}`}>
      {(title || meta) && (
        <header className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>}
          {meta && <div className="text-xs text-[var(--text-muted)]">{meta}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
