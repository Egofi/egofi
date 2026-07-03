export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <span className="text-3xl font-bold tracking-tight text-navy-950">
        egofi<span className="text-primary">.</span>
      </span>
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold text-navy-900">
          Nothing to pay here — yet.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-500">
          Payment pages live at a unique link the merchant sends you. If you
          were expecting an invoice, ask the merchant to share the link again.
        </p>
      </div>
      <p className="text-xs text-navy-400">
        Non-custodial crypto payments · your funds never sit with us
      </p>
    </main>
  );
}
