"use client";

import type { KybDocumentDto } from "@egofi/types";
import { Badge } from "@egofi/ui";
import { useState } from "react";
import { api } from "../lib/api";
import { DOC_STATUS, DOC_TYPE_LABEL } from "../lib/states";

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Renders a merchant's KYB documents. Documents are private on Cloudinary, so
 * "View" fetches a short-lived signed URL on demand and opens it in a new tab —
 * the URL is never embedded in the page.
 */
export function DocumentList({ documents }: { documents: KybDocumentDto[] }) {
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const view = async (id: string) => {
    setError(null);
    setOpening(id);
    try {
      const { url } = await api.admin.getKybDocumentUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Could not open that document — try again.");
    } finally {
      setOpening(null);
    }
  };

  if (documents.length === 0) {
    return <p className="text-sm text-navy-400">No documents uploaded.</p>;
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-danger-600">{error}</p>}
      {documents.map((d) => {
        const st = DOC_STATUS[d.status] ?? { variant: "default" as const, label: d.status };
        return (
          <div
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-100 p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-400">
                <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 0 1 2-2h4.586A2 2 0 0 1 12 2.586L15.414 6A2 2 0 0 1 16 7.414V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4zm2 6a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 6 10zm.75 2.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-navy-900">
                  {DOC_TYPE_LABEL[d.type] ?? d.type}
                </p>
                <p className="truncate text-xs text-navy-400">
                  {d.originalFilename} · {humanSize(d.sizeBytes)} ·{" "}
                  {new Date(d.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={st.variant}>{st.label}</Badge>
              <button
                type="button"
                onClick={() => view(d.id)}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                disabled={opening === d.id}
              >
                {opening === d.id ? "Opening…" : "View ↗"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
