export default function Panel({ title, meta, right, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_10px_24px_-20px_rgba(70,42,10,0.5)] ${className}`}>
      {(title || meta || right) && (
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {title && <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>}
            {meta && <div className="text-xs text-[var(--text-muted)]">{meta}</div>}
          </div>
          {right && <div className="flex items-center gap-2">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
