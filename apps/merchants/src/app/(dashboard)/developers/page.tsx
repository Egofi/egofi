"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createApiClient } from "@egofi/sdk";
import { Button, Card, CardContent, Input, Skeleton } from "@egofi/ui";
import { CopyButton } from "../../../lib/CopyButton";

const api = createApiClient();

const API_BASE =
  process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3000";

type ApiKey = { id: string; name: string; createdAt: string };

export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<{ name: string; key: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    const token = localStorage.getItem("egofi_token");
    if (!token) { window.location.href = "/login"; return; }
    api.setAuthToken(token);
    setLoading(true);
    try {
      setKeys(await api.merchant.listApiKeys());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newName.trim()) { setError("Give the key a name so you can recognise it later"); return; }
    setCreating(true);
    try {
      const result = await api.merchant.createApiKey(newName.trim());
      setRevealed({ name: result.name, key: result.key });
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the key");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Revoke this API key? Any integration using it will stop working immediately.")) return;
    setDeletingId(id);
    try { await api.merchant.deleteApiKey(id); await load(); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-6 lg:p-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Developers</h1>
        <p className="mt-1 text-sm text-navy-500">
          Integrate Egofi into your app. Authenticate server-to-server requests with an API key.
        </p>
      </header>

      {/* API endpoint */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Base URL</p>
              <code className="font-mono text-sm text-navy-900">{API_BASE}/v1</code>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton text={`${API_BASE}/v1`} label="base URL" />
              <a href={`${API_BASE}/docs`} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">API reference ↗</Button>
              </a>
            </div>
          </div>
          <p className="mt-3 rounded-lg bg-navy-50/60 p-3 font-mono text-xs text-navy-600">
            curl {API_BASE}/v1/invoices -H &quot;x-api-key: YOUR_KEY&quot;
          </p>
        </CardContent>
      </Card>

      {/* One-time reveal */}
      {revealed && (
        <div className="animate-fade-in-up rounded-2xl border border-accent-300 bg-accent-50 p-5">
          <div className="flex items-start gap-3">
            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 size-5 shrink-0 text-lime-700" aria-hidden>
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1zm3 8V5.5a3 3 0 1 0-6 0V9h6z" clipRule="evenodd" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lime-900">Copy your new key now — it won't be shown again</p>
              <p className="mt-0.5 text-sm text-lime-800">Key <strong>{revealed.name}</strong>. Store it in your server's secret manager.</p>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-lime-300 bg-white p-3">
                <code className="min-w-0 flex-1 truncate font-mono text-sm text-navy-900">{revealed.key}</code>
                <CopyButton text={revealed.key} label="API key" />
              </div>
              <button type="button" onClick={() => setRevealed(null)} className="mt-3 text-sm font-medium text-lime-800 hover:underline">
                I've saved it — dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create */}
      <Card>
        <CardContent className="p-5">
          <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Create an API key"
                placeholder="e.g. Production server"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                {...(error ? { error } : {})}
              />
            </div>
            <Button type="submit" loading={creating} size="lg">Create key</Button>
          </form>
        </CardContent>
      </Card>

      {/* Keys list */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-navy-100 px-5 py-4">
            <h2 className="text-base font-semibold text-navy-950">Your keys</h2>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : keys.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-navy-500">No API keys yet. Create one above to start integrating.</p>
            </div>
          ) : (
            <ul className="divide-y divide-navy-50">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-400">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
                        <path fillRule="evenodd" d="M8 7a5 5 0 1 1 3.61 4.804l-1.903 1.903A1 1 0 0 1 9 14H8v1a1 1 0 0 1-1 1H6v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L8.196 8.39A5.002 5.002 0 0 1 8 7z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-navy-900">{k.name}</p>
                      <p className="text-xs text-navy-400">Created {new Date(k.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" loading={deletingId === k.id} onClick={() => remove(k.id)} className="text-danger-600 hover:bg-danger-50">
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
