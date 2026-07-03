"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createApiClient } from "@egofi/sdk";
import type { MerchantProfile } from "@egofi/types";
import { cn } from "@egofi/ui";

const api = createApiClient();

type NavItem = { href: string; label: string; icon: React.ReactNode };

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
        <path d="M9.293 2.293a1 1 0 0 1 1.414 0l6 6 2 2a1 1 0 0 1-1.414 1.414L17 11.414V17a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5.586l-.293.293a1 1 0 0 1-1.414-1.414l8-8z" />
      </svg>
    ),
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
        <path
          fillRule="evenodd"
          d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-3.62-3.622A1.5 1.5 0 0 0 11.38 2H4.5zM6.75 8a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    href: "/developers",
    label: "Developers",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
        <path
          fillRule="evenodd"
          d="M6.28 5.22a.75.75 0 0 1 0 1.06L2.56 10l3.72 3.72a.75.75 0 0 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0zm7.44 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 0 1 0-1.06zM11.377 2.011a.75.75 0 0 1 .612.867l-2.5 14a.75.75 0 0 1-1.478-.264l2.5-14a.75.75 0 0 1 .866-.603z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

const SettingsIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
    <path
      fillRule="evenodd"
      d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652zM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
      clipRule="evenodd"
    />
  </svg>
);

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/developers")) return "Developers";
  const item = NAV_ITEMS.find(
    (n) => pathname === n.href || pathname.startsWith(`${n.href}/`),
  );
  return item?.label ?? "Home";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <a
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-white/10 text-white shadow-inset-hairline"
                : "text-navy-200/75 hover:bg-white/5 hover:text-white",
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
            )}
            <span className={cn("transition-colors", active ? "text-accent" : "text-navy-300/70 group-hover:text-navy-100")}>
              {item.icon}
            </span>
            {item.label}
          </a>
        );
      })}
    </>
  );
}

function UserMenu({
  merchant,
  onSignOut,
}: {
  merchant: MerchantProfile | null;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-navy-100/70"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-success text-xs font-bold text-navy-950">
          {merchant ? initials(merchant.business) : "…"}
        </span>
        <span className="hidden max-w-[9rem] truncate text-sm font-medium text-navy-800 sm:block">
          {merchant?.business ?? "Account"}
        </span>
        <svg viewBox="0 0 20 20" fill="currentColor" className={cn("size-4 text-navy-400 transition-transform", open && "rotate-180")} aria-hidden>
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-xl animate-scale-in"
        >
          <div className="border-b border-navy-100 bg-navy-50/50 p-4">
            <p className="truncate text-sm font-semibold text-navy-950">{merchant?.business}</p>
            <p className="truncate text-xs text-navy-500">{merchant?.email}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-navy-600 ring-1 ring-inset ring-navy-200">
                Tier {merchant?.kybTier ?? 0}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                  merchant?.status === "ACTIVE"
                    ? "bg-success-50 text-success-700"
                    : "bg-amber-50 text-amber-700",
                )}
              >
                {merchant?.status === "ACTIVE" ? "Active" : "Pending"}
              </span>
            </div>
          </div>
          <div className="p-1.5">
            <MenuLink href="/settings" label="Account & profile" />
            <MenuLink href="/settings/verification" label="Business verification" />
            <MenuLink href="/settings/settlement" label="Settlement settings" />
          </div>
          <div className="border-t border-navy-100 p-1.5">
            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-50"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
                <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10z" clipRule="evenodd" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      role="menuitem"
      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-navy-700 transition-colors hover:bg-navy-50"
    >
      {label}
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-navy-300" aria-hidden>
        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z" clipRule="evenodd" />
      </svg>
    </a>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("egofi_token");
    if (!token) return;
    api.setAuthToken(token);
    void api.merchant.getProfile().then(setMerchant).catch(() => {});
  }, [pathname]);

  const signOut = () => {
    localStorage.removeItem("egofi_token");
    router.push("/login");
  };

  const settingsActive = pathname.startsWith("/settings");

  const SidebarBody = (
    <>
      <a href="/dashboard" className="flex h-16 items-center px-6">
        <span className="text-xl font-bold tracking-tight text-white">
          egofi<span className="text-accent">.</span>
        </span>
      </a>
      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-navy-400/70">
          Menu
        </p>
        <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </nav>
      <div className="border-t border-white/10 p-3">
        <a
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            settingsActive
              ? "bg-white/10 text-white shadow-inset-hairline"
              : "text-navy-200/75 hover:bg-white/5 hover:text-white",
          )}
        >
          <span className={settingsActive ? "text-accent" : "text-navy-300/70"}>
            {SettingsIcon}
          </span>
          Settings
        </a>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-brand-gradient md:flex">
        <div className="pointer-events-none absolute inset-0 bg-grid-navy bg-[size:32px_32px] opacity-30" />
        <div className="relative flex h-full flex-col">{SidebarBody}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-brand-gradient animate-slide-in-right">
            {SidebarBody}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-h-screen min-w-0 flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-navy-100/70 bg-white/80 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-navy-500 hover:bg-navy-100 md:hidden"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75zm0 5A.75.75 0 0 1 2.75 14h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 14.75z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-navy-900">{pageTitle(pathname)}</h1>
          <div className="ml-auto">
            <UserMenu merchant={merchant} onSignOut={signOut} />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
