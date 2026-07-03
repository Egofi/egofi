"use client";

import { createApiClient } from "@egofi/sdk";
import type { KybDocumentDto, KybOverview } from "@egofi/types";
import { KybDocumentType, KybStatus } from "@egofi/types";
import { Badge, Button, Card, CardContent, Skeleton, cn } from "@egofi/ui";
import { useEffect, useState } from "react";
import { KYB_STATUS_META, formatCap } from "../../../../lib/kyb-meta";
import { DocumentSlot } from "./DocumentSlot";

const api = createApiClient();

const TIER1_DOCS = [KybDocumentType.BusinessRegistration, KybDocumentType.DirectorId];
const TIER2_DOCS = [
  KybDocumentType.ProofOfAddress,
  KybDocumentType.BankStatement,
  KybDocumentType.TaxId,
];

export default function VerificationPage() {
  const [overview, setOverview] = useState<KybOverview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const load = async () => {
    const token = localStorage.getItem("egofi_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    api.setAuthToken(token);
    setOverview(await api.kyb.getOverview());
  };

  useEffect(() => {
    void load();
  }, []);

  const docByType = (t: KybDocumentType): KybDocumentDto | undefined =>
    overview?.documents.find((d) => d.type === t);

  const handleUpload = async (type: KybDocumentType, file: File) => {
    await api.kyb.uploadDocument(type, file);
    await load();
  };
  const handleDelete = async (id: string) => {
    await api.kyb.deleteDocument(id);
    await load();
  };
  const handleSubmit = async () => {
    setSubmitError("");
    setSubmitting(true);
    try {
      setOverview(await api.kyb.submit());
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (!overview) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  const status = overview.status;
  const statusMeta = KYB_STATUS_META[status] ?? KYB_STATUS_META[KybStatus.Pending]!;
  const locked = status === KybStatus.UnderReview;
  const verified = status === KybStatus.Verified;
  const hasTier1 = TIER1_DOCS.every((t) => docByType(t));
  const currentTier = overview.tiers.find((t) => t.tier === overview.tier);

  return (
    <div className="space-y-6">
      {/* Status + tier progress — a single strip */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-navy-900">Verification</span>
                <Badge variant={statusMeta.variant} dot>
                  {statusMeta.label}
                </Badge>
              </div>
              <p className="mt-1 max-w-md text-sm text-navy-500">
                {status === KybStatus.Pending &&
                  "Upload the documents below and submit to raise your limits."}
                {status === KybStatus.UnderReview &&
                  "We're reviewing your documents — usually 1–2 business days."}
                {verified && `You're verified at ${currentTier?.label ?? `Tier ${overview.tier}`}.`}
                {status === KybStatus.Rejected &&
                  (overview.reviewNote ||
                    "Some documents need attention. Update them and resubmit.")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-wide text-navy-400">
                Current limit
              </p>
              <p className="text-xl font-bold tabular-nums text-navy-950">
                {formatCap(currentTier?.volumeCapUsd ?? 1_000)}
              </p>
            </div>
          </div>

          {/* Tier stepper */}
          <div className="mt-6 flex items-center gap-2">
            {overview.tiers.map((tier, i) => {
              const reached = verified && overview.tier >= tier.tier;
              const isCurrent = verified && overview.tier === tier.tier;
              return (
                <div key={tier.tier} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div
                      className={cn("h-1.5 rounded-full", reached ? "bg-primary" : "bg-navy-100")}
                    />
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isCurrent ? "text-primary" : reached ? "text-navy-700" : "text-navy-400",
                        )}
                      >
                        Tier {tier.tier}
                      </span>
                      {isCurrent && <span className="size-1.5 rounded-full bg-primary" />}
                    </div>
                    <span className="text-[11px] text-navy-400">
                      {formatCap(tier.volumeCapUsd)}
                    </span>
                  </div>
                  {i < overview.tiers.length - 1 && (
                    <span className="hidden text-navy-200 sm:block">›</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Documents — a single card, subtle grouping, no redundant cards */}
      {!verified && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-navy-950">Documents</h2>
            <p className="mt-1 text-sm text-navy-500">
              PDF or image, up to 10 MB each. Encrypted and used only for compliance review.
            </p>

            <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-navy-400">
              Required · Tier 1 ({formatCap(25_000)})
            </p>
            <div className="space-y-3">
              {TIER1_DOCS.map((t) => (
                <DocumentSlot
                  key={t}
                  type={t}
                  document={docByType(t)}
                  required
                  locked={locked}
                  onUpload={handleUpload}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-navy-400">
              For Tier 2 · unlimited
            </p>
            <div className="space-y-3">
              {TIER2_DOCS.map((t) => (
                <DocumentSlot
                  key={t}
                  type={t}
                  document={docByType(t)}
                  required={false}
                  locked={locked}
                  onUpload={handleUpload}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Inline submit */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 pt-6">
              <p className="text-sm text-navy-500">
                {locked
                  ? "Submitted — you'll be notified once review is complete."
                  : hasTier1
                    ? "We'll review your documents and set your tier."
                    : "Upload your business registration and director's ID to submit."}
              </p>
              <div className="flex items-center gap-3">
                {submitError && <span className="text-sm text-danger-600">{submitError}</span>}
                <Button onClick={handleSubmit} loading={submitting} disabled={locked || !hasTier1}>
                  {locked ? "Under review" : "Submit for review"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
