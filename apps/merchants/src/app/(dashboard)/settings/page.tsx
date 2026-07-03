"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createApiClient } from "@egofi/sdk";
import type { MerchantProfile } from "@egofi/types";
import { Badge, Button, Card, CardContent, Input, Skeleton } from "@egofi/ui";
import { CopyButton } from "../../../lib/CopyButton";

const api = createApiClient();

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function ProfilePage() {
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [business, setBusiness] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("egofi_token");
    if (!token) { window.location.href = "/login"; return; }
    api.setAuthToken(token);
    void api.merchant.getProfile().then((p) => {
      setMerchant(p);
      setBusiness(p.business);
    });
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (business.trim().length < 2) {
      setError("Business name must be at least 2 characters");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.merchant.updateProfile({ business: business.trim() });
      setMerchant(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!merchant) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  const dirty = business.trim() !== merchant.business;

  return (
    <div className="space-y-6">
      {/* Identity + business name */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-success text-xl font-bold text-navy-950 shadow-sm">
              {initials(merchant.business)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-navy-950">{merchant.business}</h2>
              <p className="truncate text-sm text-navy-500">{merchant.email}</p>
            </div>
          </div>

          <form onSubmit={save} className="mt-6 space-y-4 border-t border-navy-100 pt-6">
            <Input
              label="Business name"
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              {...(error ? { error } : {})}
            />
            <Input
              label="Email"
              value={merchant.email}
              disabled
              hint="Contact support to change the email on your account."
            />
            <div className="flex items-center gap-3">
              <Button type="submit" loading={saving} disabled={!dirty}>
                {saved ? "Saved ✓" : "Save changes"}
              </Button>
              {dirty && !saving && (
                <span className="text-sm text-navy-400">Unsaved changes</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account facts */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-400">Account</h3>
          <dl className="mt-4 divide-y divide-navy-50">
            <Row label="Account ID">
              <span className="font-mono text-xs text-navy-700">{merchant.id}</span>
              <CopyButton text={merchant.id} label="account ID" />
            </Row>
            <Row label="Account status">
              <Badge variant={merchant.status === "ACTIVE" ? "success" : "warning"} dot>
                {merchant.status === "ACTIVE" ? "Active" : "Pending approval"}
              </Badge>
            </Row>
            <Row label="Verification">
              <div className="flex items-center gap-2">
                <span className="text-navy-700">
                  Tier {merchant.kybTier}
                  {merchant.kybStatus === "VERIFIED" && " · Verified"}
                  {merchant.kybStatus === "UNDER_REVIEW" && " · Under review"}
                </span>
                <a href="/settings/verification" className="text-sm font-medium text-primary hover:underline">
                  Manage →
                </a>
              </div>
            </Row>
            <Row label="Member since">
              <span className="text-navy-700">
                {new Date(merchant.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </Row>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <dt className="text-sm text-navy-500">{label}</dt>
      <dd className="flex items-center gap-2 text-right text-sm">{children}</dd>
    </div>
  );
}
