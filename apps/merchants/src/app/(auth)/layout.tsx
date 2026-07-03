export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[5fr_7fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-gradient lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Layered atmosphere: mesh glow + faint grid */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-brand-mesh" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-grid-navy bg-[size:40px_40px] opacity-30"
        />

        <a href="/" className="relative z-10 flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-white">
            egofi<span className="text-accent">.</span>
          </span>
        </a>

        <div className="relative z-10 max-w-md space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-navy-100/90 shadow-inset-hairline">
            <span className="size-1.5 rounded-full bg-accent animate-pulse-soft" />
            Non-custodial · Live on Tron, BSC, Solana & more
          </div>
          <h1 className="text-display-md font-bold leading-[1.1] text-white">
            Get paid in crypto.
            <br />
            Settle in <span className="text-accent">your</span> stablecoin.
          </h1>
          <p className="text-lg leading-relaxed text-navy-100/85">
            Customers pay with any token on any chain — you receive USDT, every time. Your money
            never sits with us.
          </p>
          <ul className="space-y-3.5 text-sm text-navy-100/85">
            {[
              "One address per network — we handle the rest",
              "Live settlement tracking, signed webhooks included",
              "No float, no custody, no surprises",
            ].map((line) => (
              <li key={line} className="flex items-center gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/20 ring-1 ring-inset ring-accent/30">
                  <svg viewBox="0 0 12 12" className="size-3 fill-accent" aria-hidden>
                    <path d="M10.28 2.28 4.5 8.06 1.72 5.28l-1 1L4.5 10.06l6.78-6.78z" />
                  </svg>
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-navy-200/50">
          © 2026 Nuelgreen AI · Non-custodial crypto gateway
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center bg-white px-4 py-12 sm:px-8">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile logo */}
          <a href="/" className="mb-10 block text-center lg:hidden">
            <span className="text-2xl font-bold tracking-tight text-navy-950">
              egofi<span className="text-primary">.</span>
            </span>
          </a>
          {children}
        </div>
      </main>
    </div>
  );
}
