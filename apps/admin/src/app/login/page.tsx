"use client";

import { createApiClient } from "@egofi/sdk";
import { Button, Input } from "@egofi/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const api = createApiClient();

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { accessToken } = await api.admin.login(email, password);
      localStorage.setItem("egofi_admin_token", accessToken);
      router.push("/merchants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-gradient p-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-white">
            egofi<span className="text-accent">.</span>
          </span>
          <p className="mt-1 text-sm font-medium uppercase tracking-widest text-navy-200/70">
            Operations
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-card">
          <h1 className="text-lg font-bold tracking-tight text-navy-950">Operator sign in</h1>
          <p className="mt-1 text-sm text-navy-500">Restricted to egofi staff.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@egofi.io"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              error={error}
            />
            <Button type="submit" loading={loading} size="lg" className="w-full">
              Sign in
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-navy-200/60">
          Sessions expire after 8 hours. All actions are audited.
        </p>
      </div>
    </main>
  );
}
