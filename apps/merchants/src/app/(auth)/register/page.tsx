"use client";

import { createApiClient } from "@egofi/sdk";
import { Button, Input } from "@egofi/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const api = createApiClient();

const SETTLEMENT_ASSETS = [
  { value: "USDT-TRC20", label: "USDT (Tron) — recommended" },
  { value: "USDT-BEP20", label: "USDT (BSC)" },
  { value: "USDT-ERC20-POLYGON", label: "USDT (Polygon)" },
  { value: "USDC-SOL", label: "USDC (Solana)" },
  { value: "USDC-BASE", label: "USDC (Base)" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [settlementAsset, setSettlementAsset] = useState("USDT-TRC20");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const { accessToken } = await api.auth.register({
        business,
        email,
        password,
        settlementAsset,
        settlementAddresses: {}, // added later in Settings
      });
      localStorage.setItem("egofi_token", accessToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Create your account</h1>
        <p className="mt-1.5 text-sm text-navy-500">
          Accept crypto payments, settle in your chosen stablecoin.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Business name"
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
          required
          autoComplete="organization"
          placeholder="Acme Store"
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={error}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settlement-asset" className="text-sm font-medium text-navy-800">
            Settlement asset
          </label>
          <select
            id="settlement-asset"
            value={settlementAsset}
            onChange={(e) => setSettlementAsset(e.target.value)}
            className="w-full appearance-none rounded-lg border border-navy-200 bg-surface px-3.5 py-2.5 text-sm text-navy-900 outline-none transition-all duration-150 hover:border-navy-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
          >
            {SETTLEMENT_ASSETS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-navy-400">
            What you receive, regardless of what customers pay with. Add your receiving addresses
            after signing in.
          </p>
        </div>
        <Button type="submit" loading={loading} size="lg" className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-navy-500">
        Already have an account?{" "}
        <a
          href="/login"
          className="font-medium text-primary hover:text-primary-800 hover:underline"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}
