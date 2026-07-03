"use client";

import { cn } from "@egofi/ui";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/verification", label: "Verification" },
  { href: "/settings/settlement", label: "Settlement" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-4xl p-5 sm:p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Settings</h1>
        <p className="mt-1 text-sm text-navy-500">
          Manage your account, verification, and how you get paid.
        </p>
      </header>

      {/* Sub-nav tabs */}
      <div className="mb-8 flex gap-1 overflow-x-auto border-b border-navy-100">
        {TABS.map((tab) => {
          const active =
            tab.href === "/settings" ? pathname === "/settings" : pathname.startsWith(tab.href);
          return (
            <a
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors",
                active ? "text-primary" : "text-navy-500 hover:text-navy-800",
              )}
            >
              {tab.label}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </a>
          );
        })}
      </div>

      <div className="animate-fade-in">{children}</div>
    </div>
  );
}
