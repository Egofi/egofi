export function MockModeBanner() {
  if (process.env["NEXT_PUBLIC_API_MODE"] !== "mock") return null;
  return (
    <div
      role="alert"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-navy-950 px-4 py-1.5 text-xs font-semibold text-accent"
    >
      <span className="size-2 rounded-full bg-accent animate-pulse" />
      MOCK MODE — no real backend connected. Data is simulated.
    </div>
  );
}
