"use client";

import { cn } from "@egofi/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { CoinIcon } from "./CoinIcon";
import { PAY_CURRENCIES, type PayCurrency, networkOf } from "./crypto-assets";

function NetworkBadge({ chain }: { chain: string }) {
  const net = networkOf(chain);
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", net.badge)}>
      {net.label}
    </span>
  );
}

function Row({ c }: { c: PayCurrency }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <CoinIcon icon={c.icon} symbol={c.asset} size={28} />
      <span className="flex min-w-0 flex-col text-left leading-tight">
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-navy-900">{c.asset}</span>
          <NetworkBadge chain={c.chain} />
        </span>
        <span className="truncate text-xs text-navy-400">{c.name}</span>
      </span>
    </span>
  );
}

/**
 * Pay-currency picker: searchable, grouped into Popular + all supported
 * asset×network routes, each with its real coin icon and a network badge.
 */
export function CurrencySelect({
  value,
  onChange,
  currencies = PAY_CURRENCIES,
}: {
  value: string;
  onChange: (id: string) => void;
  currencies?: PayCurrency[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = currencies.find((c) => c.id === value);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    // Autofocus search when opening.
    inputRef.current?.focus();
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return currencies;
    return currencies.filter((c) =>
      `${c.asset} ${c.chain} ${c.name} ${networkOf(c.chain).label}`.toLowerCase().includes(q),
    );
  }, [query, currencies]);

  const popular = filtered.filter((c) => c.popular);
  const rest = filtered.filter((c) => !c.popular);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-navy-200 bg-white px-4 py-3 text-left transition-colors hover:border-navy-300 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
      >
        {selected ? <Row c={selected} /> : <span className="text-navy-400">Select a currency</span>}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn("size-5 shrink-0 text-navy-400 transition-transform", open && "rotate-180")}
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
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-xl animate-scale-in">
          <div className="border-b border-navy-50 p-2">
            <div className="flex items-center gap-2 rounded-lg bg-navy-50 px-3 py-2">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-4 text-navy-400"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 1 0 3.16 10.01l3.66 3.66a.75.75 0 1 0 1.06-1.06l-3.66-3.66A5.5 5.5 0 0 0 9 3.5zM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search asset or network…"
                className="w-full bg-transparent text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none"
              />
            </div>
          </div>

          <ul className="max-h-72 overflow-y-auto p-1.5">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-navy-400">No matches</li>
            )}
            {popular.length > 0 && (
              <li className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                Popular
              </li>
            )}
            {popular.map((c) => (
              <Option key={c.id} c={c} selected={c.id === value} onPick={pick} />
            ))}
            {rest.length > 0 && (
              <li className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                All currencies
              </li>
            )}
            {rest.map((c) => (
              <Option key={c.id} c={c} selected={c.id === value} onPick={pick} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Option({
  c,
  selected,
  onPick,
}: {
  c: PayCurrency;
  selected: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(c.id)}
        aria-current={selected}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-navy-50",
          selected && "bg-primary-50",
        )}
      >
        <Row c={c} />
        {selected && (
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-4 shrink-0 text-primary"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
    </li>
  );
}
