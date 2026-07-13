"use client";

import { useState } from "react";

/**
 * Walkthrough video for getting an account xpub. Drop your recorded clip here
 * once it's ready — either set NEXT_PUBLIC_XPUB_GUIDE_VIDEO_URL or edit this
 * constant. A YouTube/Vimeo *embed* URL (…/embed/…) or a direct .mp4/.webm link
 * both work. While it's empty the guide shows a "coming soon" placeholder and
 * the written steps below, so the feature is useful before the video exists.
 */
const XPUB_VIDEO_URL = process.env["NEXT_PUBLIC_XPUB_GUIDE_VIDEO_URL"] ?? "";

const isFileVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(XPUB_VIDEO_URL);

const STEPS: { title: string; body: string }[] = [
  {
    title: "Open the wallet that holds your crypto",
    body: "Use a self-custody HD wallet (e.g. Trezor Suite, SafePal, Ellipal, or any wallet with a “show public key” option). Pick the account you want payments to settle into.",
  },
  {
    title: "Find “Extended public key (xpub)”",
    body: "Open that account's details or settings — usually a ••• menu or a gear icon — and look for “Show public key”, “Extended public key”, or “xpub”. Choose the account-level one, not a single address.",
  },
  {
    title: "Copy it and paste it above",
    body: "The value is a long string starting with xpub…. Copy the whole thing and paste it into the Account xpub field. We validate it the moment you save, so you'll know right away if it's the wrong one.",
  },
];

export function XpubGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-[#1D4ED8] hover:underline"
        aria-expanded={open}
      >
        {open ? "Hide the guide" : "How do I get my xpub?"}
      </button>

      {open && (
        <div className="mt-3 space-y-4 rounded-xl border border-navy-100 bg-surface p-4">
          {/* Video walkthrough — the primary teaching tool once recorded. */}
          <div className="overflow-hidden rounded-lg bg-black/95">
            {XPUB_VIDEO_URL ? (
              <div className="relative aspect-video">
                {isFileVideo ? (
                  // biome-ignore lint/a11y/useMediaCaption: merchant-supplied walkthrough
                  <video src={XPUB_VIDEO_URL} controls className="h-full w-full" preload="none">
                    Your browser can't play this video.
                  </video>
                ) : (
                  <iframe
                    src={XPUB_VIDEO_URL}
                    title="How to get your xpub"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    className="absolute inset-0 h-full w-full border-0"
                  />
                )}
              </div>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-1 text-center text-navy-200">
                <span aria-hidden className="text-2xl">
                  ▶
                </span>
                <span className="text-sm font-medium">Video walkthrough coming soon</span>
                <span className="px-6 text-xs text-navy-400">
                  Follow the written steps below in the meantime.
                </span>
              </div>
            )}
          </div>

          {/* Written steps — the fallback that always works. */}
          <ol className="space-y-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-semibold text-navy-700">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-navy-700">
                  <strong className="font-semibold text-navy-900">{step.title}.</strong> {step.body}
                </span>
              </li>
            ))}
          </ol>

          {/* Which account to export, per chain. */}
          <p className="rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-600">
            For Ethereum, BSC, Polygon and Base, export your <strong>EVM</strong> account (path{" "}
            <span className="font-mono">m/44'/60'/0'</span>). For Tron, use{" "}
            <span className="font-mono">m/44'/195'/0'</span>.
          </p>

          {/* Safety — non-negotiable. */}
          <p className="text-xs leading-relaxed text-navy-500">
            <strong className="text-navy-700">You're only sharing a public key.</strong> It lets
            egofi see incoming payments and create receiving addresses — it can never move your
            funds. Never paste your recovery phrase, or any key starting with{" "}
            <span className="font-mono">xprv</span>, here or anywhere.
          </p>

          <p className="text-xs leading-relaxed text-navy-500">
            Can't find an xpub option in your wallet? Not every wallet has one — you can leave
            fresh-address mode off and your single settlement address will work perfectly.
          </p>
        </div>
      )}
    </div>
  );
}
