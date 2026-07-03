"use client";

import { useRef, useState } from "react";
import { KybDocumentType } from "@egofi/types";
import type { KybDocumentDto } from "@egofi/types";
import { Badge, Spinner, cn } from "@egofi/ui";
import { DOCUMENT_META, formatBytes } from "../../../../lib/kyb-meta";

const ACCEPT = ".pdf,image/jpeg,image/png,image/webp,image/heic";
const MAX_BYTES = 10 * 1024 * 1024;

export function DocumentSlot({
  type,
  document,
  required,
  locked,
  onUpload,
  onDelete,
}: {
  type: KybDocumentType;
  document: KybDocumentDto | undefined;
  required: boolean;
  locked: boolean;
  onUpload: (type: KybDocumentType, file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const meta = DOCUMENT_META[type];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = () => { setError(""); inputRef.current?.click(); };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) { setError("File is too large (max 10 MB)."); return; }
    setBusy(true);
    setError("");
    try {
      await onUpload(type, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!document) return;
    setBusy(true);
    try { await onDelete(document.id); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not remove"); }
    finally { setBusy(false); }
  };

  const done = Boolean(document);

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border p-4 transition-colors",
        done ? "border-navy-200 bg-white" : "border-dashed border-navy-200 bg-navy-50/30",
      )}
    >
      {/* Status dot / icon */}
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          document?.status === "APPROVED" ? "bg-success-50 text-success-600"
            : document?.status === "REJECTED" ? "bg-danger-50 text-danger-600"
            : done ? "bg-primary-50 text-primary"
            : "bg-navy-100 text-navy-400",
        )}
      >
        {done ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
            <path fillRule="evenodd" d="M4 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.414A2 2 0 0 0 17.414 6L14 2.586A2 2 0 0 0 12.586 2H4z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
          </svg>
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-navy-900">{meta.label}</p>
          {document ? (
            document.status === "APPROVED" ? <Badge variant="success" dot>Approved</Badge>
            : document.status === "REJECTED" ? <Badge variant="danger" dot>Rejected</Badge>
            : <Badge variant="info" dot>Uploaded</Badge>
          ) : required ? (
            <Badge variant="warning">Required</Badge>
          ) : (
            <Badge variant="default">Optional</Badge>
          )}
        </div>
        {document ? (
          <p className="truncate text-xs text-navy-400">
            {document.originalFilename} · {formatBytes(document.sizeBytes)}
            {document.reviewNote && <span className="text-danger-600"> · {document.reviewNote}</span>}
          </p>
        ) : (
          <p className="truncate text-xs text-navy-400">{meta.examples || meta.description}</p>
        )}
        {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
      </div>

      {/* Action */}
      {!locked && (
        <div className="flex shrink-0 items-center gap-3">
          {document && document.status !== "APPROVED" && (
            <button type="button" onClick={remove} disabled={busy} className="text-sm font-medium text-navy-400 hover:text-danger-600 disabled:opacity-50">
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-50 px-3 py-1.5 text-sm font-medium text-navy-700 transition-colors hover:bg-navy-100 disabled:opacity-50"
          >
            {busy ? <Spinner size="sm" className="text-primary" /> : null}
            {document ? "Replace" : "Upload"}
          </button>
          <input ref={inputRef} type="file" accept={ACCEPT} onChange={onFile} className="hidden" />
        </div>
      )}
    </div>
  );
}
