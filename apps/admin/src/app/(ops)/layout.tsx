"use client";

import { Logo, cn } from "@egofi/ui";
import { usePathname, useRouter } from "next/navigation";

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path fillRule="evenodd" d={path} clipRule="evenodd" />
    </svg>
  );
}

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <Icon path="M3 3.75A.75.75 0 0 1 3.75 3h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75h-3.5A.75.75 0 0 1 3 7.25v-3.5zm0 7A.75.75 0 0 1 3.75 10h3.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1-.75-.75v-5.5zm9-7a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1-.75-.75v-5.5zm0 9a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1-.75-.75v-3.5z" />
    ),
  },
  {
    href: "/payments",
    label: "Payments",
    icon: (
      <Icon path="M1 4.75C1 3.784 1.784 3 2.75 3h14.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 17.25 17H2.75A1.75 1.75 0 0 1 1 15.25V4.75zm1.75-.25a.25.25 0 0 0-.25.25V6h15V4.75a.25.25 0 0 0-.25-.25H2.75zM17.5 9.5h-15v5.75c0 .138.112.25.25.25h14.5a.25.25 0 0 0 .25-.25V9.5z" />
    ),
  },
  {
    href: "/subscriptions",
    label: "Subscriptions",
    icon: (
      <Icon path="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h1.633a.75.75 0 0 0 0-1.5H3.664a.75.75 0 0 0-.75.75v3.768a.75.75 0 0 0 1.5 0v-1.61l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39zm1.223-3.99A.75.75 0 0 0 17.25 6.5H13.5a.75.75 0 0 0 0 1.5h1.633l-.312.311a5.5 5.5 0 0 0-9.201 2.466.75.75 0 0 0 1.449.39 4 4 0 0 1 6.68-1.79l.311.31H12.5a.75.75 0 0 0 0 1.5h3.75a.75.75 0 0 0 .75-.75V7.434z" />
    ),
  },
  {
    href: "/merchants",
    label: "Merchants",
    icon: (
      <Icon path="M10 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 18a7 7 0 1 1 14 0v.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5V18z" />
    ),
  },
  {
    href: "/operations",
    label: "Operations",
    icon: (
      <Icon path="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.83 7.898a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652zM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    ),
  },
  {
    href: "/audit",
    label: "Audit Log",
    icon: (
      <Icon path="M4.25 2A2.25 2.25 0 0 0 2 4.25v11.5A2.25 2.25 0 0 0 4.25 18h11.5A2.25 2.25 0 0 0 18 15.75V4.25A2.25 2.25 0 0 0 15.75 2H4.25zm2 4a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5zm0 3.5a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5zm0 3.5a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5h-4z" />
    ),
  },
  {
    href: "/fee-policy",
    label: "Fee Policy",
    icon: (
      <Icon path="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.75-12.5a.75.75 0 0 0-1.5 0v.541a3.06 3.06 0 0 0-.941.328c-.618.354-1.184 1.007-1.184 1.981 0 .85.447 1.442 1.02 1.798.475.294 1.062.462 1.53.596l.06.017c.535.153.94.28 1.233.462.263.163.407.351.407.677 0 .34-.14.562-.375.719-.256.17-.65.281-1.125.281-.593 0-1.157-.244-1.51-.598a.75.75 0 1 0-1.06 1.06c.42.421.99.72 1.945.865v.523a.75.75 0 0 0 1.5 0v-.541c.328-.064.65-.17.941-.328.618-.354 1.184-1.007 1.184-1.981 0-.85-.447-1.442-1.02-1.798-.475-.294-1.062-.462-1.53-.596l-.06-.017c-.535-.153-.94-.28-1.233-.462-.263-.163-.407-.351-.407-.677 0-.34.14-.562.375-.719.256-.17.65-.281 1.125-.281.593 0 1.157.244 1.51.598a.75.75 0 0 0 1.06-1.06c-.42-.421-.99-.72-1.945-.865V5.5z" />
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
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                <span className={cn(active ? "text-accent" : "text-navy-300")}>{item.icon}</span>
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
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5 text-navy-300"
              aria-hidden
            >
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
          <a href="/merchants" className="flex items-center gap-2">
            <Logo size={36} />
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
