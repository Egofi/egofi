"use client";

import type { MerchantProfile } from "@egofi/types";
import { KybStatus } from "@egofi/types";
import { cn } from "@egofi/ui";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnnouncementBar } from "../../lib/AnnouncementBar";
import { LanguageSwitcher } from "../../lib/LanguageSwitcher";
import { api } from "../../lib/api";
import { loginRedirect } from "../../lib/auth";

type NavLeaf = { href: string; label: string; icon?: React.ReactNode };
type NavGroup = { label: string; icon: React.ReactNode; children: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

const isGroup = (e: NavEntry): e is NavGroup => "children" in e;

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path d="M9.293 2.293a1 1 0 0 1 1.414 0l6 6 2 2a1 1 0 0 1-1.414 1.414L17 11.414V17a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5.586l-.293.293a1 1 0 0 1-1.414-1.414l8-8z" />
    </svg>
  ),
  integrations: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path d="M7 2a1.5 1.5 0 0 0-1.5 1.5V5H4A1.5 1.5 0 0 0 2.5 6.5v3.25a.75.75 0 0 0 .75.75 1.25 1.25 0 1 1 0 2.5.75.75 0 0 0-.75.75V17A1.5 1.5 0 0 0 4 18.5h3.25a.75.75 0 0 0 .75-.75 1.25 1.25 0 1 1 2.5 0 .75.75 0 0 0 .75.75H16a1.5 1.5 0 0 0 1.5-1.5v-3.25a.75.75 0 0 0-.75-.75 1.25 1.25 0 1 1 0-2.5.75.75 0 0 0 .75-.75V6.5A1.5 1.5 0 0 0 16 5h-1.5V3.5A1.5 1.5 0 0 0 13 2a1.5 1.5 0 0 0-1.5 1.5V5h-3V3.5A1.5 1.5 0 0 0 7 2z" />
    </svg>
  ),
  paymentTools: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v.5H1v-.5zM1 7.25h18v7.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-7.5zM4 12.5a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5H4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  payments: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-3.62-3.622A1.5 1.5 0 0 0 11.38 2H4.5zM6.75 8a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
  subscriptions: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219z"
        clipRule="evenodd"
      />
    </svg>
  ),
  developers: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M6.28 5.22a.75.75 0 0 1 0 1.06L2.56 10l3.72 3.72a.75.75 0 0 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0zm7.44 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 0 1 0-1.06zM11.377 2.011a.75.75 0 0 1 .612.867l-2.5 14a.75.75 0 0 1-1.478-.264l2.5-14a.75.75 0 0 1 .866-.603z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

const TOP_NAV: NavEntry[] = [
  { href: "/dashboard", label: "Dashboard", icon: ICONS.dashboard },
  { href: "/integrations", label: "Integrations", icon: ICONS.integrations },
  {
    label: "Payment tools",
    icon: ICONS.paymentTools,
    children: [
      { href: "/invoices", label: "Payments", icon: ICONS.payments },
      { href: "/subscriptions", label: "Subscriptions", icon: ICONS.subscriptions },
    ],
  },
  { href: "/developers", label: "Developers", icon: ICONS.developers },
];

const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3000";
const DOC_LINKS = [
  { href: `${API_BASE}/docs`, label: "API Docs" },
  { href: "https://github.com/Egofi/egofi#readme", label: "SDK Docs" },
  { href: "https://egofi.dev/terms", label: "Terms of Service" },
];

const isChildActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

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
  if (pathname.startsWith("/subscriptions")) return "Subscriptions";
  if (pathname.startsWith("/integrations")) return "Integrations";
  if (pathname.startsWith("/invoices")) return "Payments";
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  return "Dashboard";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function NavLeafLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavLeaf;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isChildActive(pathname, item.href);
  return (
    <a
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
      <span
        className={cn(
          "transition-colors",
          active ? "text-accent" : "text-navy-300/70 group-hover:text-navy-100",
        )}
      >
        {item.icon}
      </span>
      {item.label}
    </a>
  );
}

function NavGroupItem({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: () => void;
}) {
  const childActive = group.children.some((c) => isChildActive(pathname, c.href));
  const [open, setOpen] = useState(childActive);
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          childActive ? "text-white" : "text-navy-200/75 hover:bg-white/5 hover:text-white",
        )}
      >
        <span className={childActive ? "text-accent" : "text-navy-300/70"}>{group.icon}</span>
        {group.label}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn(
            "ml-auto size-4 text-navy-300/70 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="mt-1 ml-4 space-y-1 border-l border-white/10 pl-2">
          {group.children.map((child) => {
            const active = isChildActive(pathname, child.href);
            return (
              <a
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-navy-200/70 hover:bg-white/5 hover:text-white",
                )}
              >
                {child.label}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavTree({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <div className="space-y-1">
      {TOP_NAV.map((entry) =>
        isGroup(entry) ? (
          <NavGroupItem
            key={entry.label}
            group={entry}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ) : (
          <NavLeafLink key={entry.href} item={entry} pathname={pathname} onNavigate={onNavigate} />
        ),
      )}
    </div>
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
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn("size-4 text-navy-400 transition-transform", open && "rotate-180")}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
            clipRule="evenodd"
          />
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
        </div>
      )}
    </div>
  );
}

/**
 * "Verify account" pill shown in the header until KYB is verified — mirrors the
 * reference console's verification nudge. Green + done once verified.
 */
function VerifyChip({ merchant }: { merchant: MerchantProfile | null }) {
  if (!merchant) return null;
  const verified = merchant.kybStatus === KybStatus.Verified;
  const underReview = merchant.kybStatus === KybStatus.UnderReview;

  if (verified) {
    return (
      <span className="hidden items-center gap-1.5 rounded-lg bg-success-50 px-2.5 py-1.5 text-xs font-semibold text-success-700 ring-1 ring-inset ring-success-200 sm:inline-flex">
        <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
          <path
            fillRule="evenodd"
            d="M8 1l1.9 1.36 2.32-.2.86 2.17 2.06 1.09-.6 2.25.6 2.25-2.06 1.09-.86 2.17-2.32-.2L8 15l-1.9-1.36-2.32.2-.86-2.17-2.06-1.09.6-2.25-.6-2.25 2.06-1.09.86-2.17 2.32.2L8 1zm3.03 5.28a.75.75 0 0 0-1.06-1.06L7.25 7.94 6.03 6.72a.75.75 0 0 0-1.06 1.06l1.75 1.75a.75.75 0 0 0 1.06 0l3.25-3.25z"
            clipRule="evenodd"
          />
        </svg>
        Verified
      </span>
    );
  }

  return (
    <a
      href="/settings/verification"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors",
        underReview
          ? "bg-info-50 text-info-700 ring-info-200 hover:bg-info-100"
          : "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100",
      )}
    >
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
        <path
          fillRule="evenodd"
          d="M8 1a3 3 0 0 0-3 3v1H4.5A1.5 1.5 0 0 0 3 6.5v6A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 11.5 5H11V4a3 3 0 0 0-3-3zm1.5 4V4a1.5 1.5 0 0 0-3 0v1h3z"
          clipRule="evenodd"
        />
      </svg>
      <span className="hidden sm:inline">
        {underReview ? "Verification pending" : "Verify account"}
      </span>
      <span className="sm:hidden">Verify</span>
    </a>
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
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z"
          clipRule="evenodd"
        />
      </svg>
    </a>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("egofi_token");
    if (!token) {
      loginRedirect();
      return;
    }
    api.setAuthToken(token);
    void api.merchant
      .getProfile()
      .then(setMerchant)
      .catch(() => {});
  }, [pathname]);

  // Sign out returns to /login with a `next` back here, so logging in again
  // lands the merchant on the page they were on.
  const signOut = () => loginRedirect();

  const settingsActive = pathname.startsWith("/settings");

  const SidebarBody = (
    <>
      <a href="/dashboard" className="flex h-16 items-center px-6">
        <span className="text-xl font-bold tracking-tight text-white">
          egofi<span className="text-accent">.</span>
        </span>
      </a>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-navy-400/70">
          Menu
        </p>
        <NavTree pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
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

        <div className="mt-2 space-y-0.5 border-t border-white/10 pt-2">
          {DOC_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-navy-300/70 transition-colors hover:bg-white/5 hover:text-navy-100"
            >
              {link.label}
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-3 opacity-60"
                aria-hidden
              >
                <path d="M6.5 3.5a.75.75 0 0 0 0 1.5h2.44L4.22 9.72a.75.75 0 1 0 1.06 1.06L10 6.06V8.5a.75.75 0 0 0 1.5 0v-4a.75.75 0 0 0-.75-.75h-4z" />
                <path d="M3.5 5.5A1.5 1.5 0 0 1 5 4h1a.75.75 0 0 1 0 1.5H5v5.5h5.5V10a.75.75 0 0 1 1.5 0v1a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11v-5.5z" />
              </svg>
            </a>
          ))}
          <a
            href="mailto:support@egofi.dev"
            className="block px-3 pt-2 text-xs font-medium text-info-300 hover:underline"
          >
            support@egofi.dev
          </a>
        </div>
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
          <div
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-brand-gradient animate-slide-in-right">
            {SidebarBody}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-h-screen min-w-0 flex-col md:pl-64">
        <AnnouncementBar />
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-navy-100/70 bg-white/80 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-navy-500 hover:bg-navy-100 md:hidden"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
              <path
                fillRule="evenodd"
                d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75zm0 5A.75.75 0 0 1 2.75 14h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 14.75z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-navy-900">{pageTitle(pathname)}</h1>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <VerifyChip merchant={merchant} />
            <LanguageSwitcher />
            <span className="hidden h-6 w-px bg-navy-100 sm:block" />
            <UserMenu merchant={merchant} onSignOut={signOut} />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
