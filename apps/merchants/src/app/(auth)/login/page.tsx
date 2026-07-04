"use client";

import { createApiClient } from "@egofi/sdk";
import { Button, Input } from "@egofi/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { safeNext } from "../../../lib/auth";

// Login uses its own client (no onUnauthorized) so an invalid-credentials 401
// shows an error instead of redirecting back to /login.
const api = createApiClient();

export default function LoginPage() {
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
      const { accessToken } = await api.auth.login(email, password);
      localStorage.setItem("egofi_token", accessToken);
      // Return to the page the merchant was on before being logged out.
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(safeNext(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Welcome back</h1>
        <p className="mt-1.5 text-sm text-navy-500">Sign in to your merchant dashboard.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@business.com"
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

      <p className="mt-8 text-center text-sm text-navy-500">
        New to Egofi?{" "}
        <a
          href="/register"
          className="font-medium text-primary hover:text-primary-800 hover:underline"
        >
          Create an account
        </a>
      </p>
    </div>
  );
}
