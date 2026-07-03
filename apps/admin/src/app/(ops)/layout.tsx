"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@egofi/ui";

const NAV_ITEMS = [
  {
    href: "/merchants",
    label: "Merchants",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
        <path d="M10 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 18a7 7 0 1 1 14 0v.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5V18z" />
      </svg>
    ),
  },
  {
    href: "/fee-policy",
    label: "Fee Policy",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.75-12.5a.75.75 0 0 0-1.5 0v.541a3.06 3.06 0 0 0-.941.328c-.618.354-1.184 1.007-1.184 1.981 0 .85.447 1.442 1.02 1.798.475.294 1.062.462 1.53.596l.06.017c.535.153.94.28 1.233.462.263.163.407.351.407.677 0 .34-.14.562-.375.719-.256.17-.65.281-1.125.281-.593 0-1.157-.244-1.51-.598a.75.75 0 1 0-1.06 1.06c.42.421.99.72 1.945.865v.523a.75.75 0 0 0 1.5 0v-.541c.328-.064.65-.17.941-.328.618-.354 1.184-1.007 1.184-1.981 0-.85-.447-1.442-1.02-1.798-.475-.294-1.062-.462-1.53-.596l-.06-.017c-.535-.153-.94-.28-1.233-.462-.263-.163-.407-.351-.407-.677 0-.34.14-.562.375-.719.256-.17.65-.281 1.125-.281.593 0 1.157.244 1.51.598a.75.75 0 0 0 1.06-1.06c-.42-.421-.99-.72-1.945-.865V5.5z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
] as const;

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = () => {
    localStorage.removeItem("egofi_admin_token");
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-navy-950 md:flex">
        <a href="/merchants" className="flex h-16 items-center gap-2 px-6">
          <span className="text-xl font-bold tracking-tight text-white">
            egofi<span className="text-accent">.</span>
          </span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-navy-200">
            Ops
          </span>
        </a>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-navy-200 hover:bg-white/5 hover:text-white",
                )}
              >
                <span className={cn(active ? "text-accent" : "text-navy-300")}>
                  {item.icon}
                </span>
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-200 transition-colors hover:bg-white/5 hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5 text-navy-300" aria-hidden>
              <path
                fillRule="evenodd"
                d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10z"
                clipRule="evenodd"
              />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        {/* Mobile topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-navy-100 bg-white/90 px-4 backdrop-blur md:hidden">
          <a href="/merchants" className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-navy-950">
            egofi<span className="text-primary">.</span>
            <span className="rounded bg-navy-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-navy-500">
              Ops
            </span>
          </a>
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg p-2",
                  pathname.startsWith(item.href)
                    ? "bg-navy-50 text-primary"
                    : "text-navy-400 hover:text-navy-700",
                )}
                aria-label={item.label}
              >
                {item.icon}
              </a>
            ))}
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg p-2 text-navy-400 hover:text-navy-700"
              aria-label="Sign out"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
