import type {
  CheckoutSessionDto,
  CreateInvoiceDto,
  CreateInvoicePayload,
  CreateMerchantDto,
  CreateSubscriptionPlanDto,
  FeePolicy,
  IntegrationSettingsDto,
  InvoiceDto,
  InvoiceStatusDto,
  KybDocumentDto,
  KybDocumentType,
  KybOverview,
  KybReviewItem,
  MerchantProfile,
  NotifySubscriptionDto,
  SubscriptionPlanDto,
  UpdateProfileDto,
  UpdateSettlementDto,
} from "@egofi/types";

export interface EgofiClientOptions {
  baseUrl: string;
  apiKey?: string;
  authToken?: string;
}

export class EgofiApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "EgofiApiError";
  }
}

/**
 * UUID v4 that works everywhere the SDK runs. `crypto.randomUUID` is only
 * defined in secure contexts (https / localhost) — opening a dev app via a
 * LAN IP over plain http loses it, so fall back to getRandomValues.
 */
function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export class EgofiClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  /**
   * Called whenever a request comes back 401 Unauthorized — i.e. the session
   * is missing or expired. Apps set this to clear local auth and redirect to
   * login. Not fired in the SDK itself beyond invoking the callback.
   */
  onUnauthorized?: () => void;

  constructor(options: EgofiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.headers = { "Content-Type": "application/json" };
    if (options.apiKey) {
      this.headers["x-api-key"] = options.apiKey;
    }
    if (options.authToken) {
      this.headers["Authorization"] = `Bearer ${options.authToken}`;
    }
  }

  setAuthToken(token: string): void {
    this.headers["Authorization"] = `Bearer ${token}`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { idempotencyKey?: string },
  ): Promise<T> {
    // The backend requires an Idempotency-Key on every mutating endpoint.
    // The SDK supplies one automatically; callers that retry a logical
    // operation should pass their own key so the retry replays instead of
    // re-executing.
    const isMutating = method !== "GET" && method !== "HEAD";
    const idempotencyHeaders: Record<string, string> = isMutating
      ? { "Idempotency-Key": options?.idempotencyKey ?? generateIdempotencyKey() }
      : {};

    // Only advertise a JSON content-type when we actually send a body. A POST
    // with `Content-Type: application/json` and an empty body is rejected by the
    // server's JSON body parser (e.g. rotate-secret / kyb-submit take no body).
    const hasBody = body !== undefined;
    const { "Content-Type": _contentType, ...noBodyHeaders } = this.headers;

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { ...(hasBody ? this.headers : noBodyHeaders), ...idempotencyHeaders },
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      let code = "UNKNOWN_ERROR";
      let message = response.statusText;
      try {
        const err = (await response.json()) as { code?: string; message?: string };
        code = err.code ?? code;
        message = err.message ?? message;
      } catch {
        // ignore parse failure
      }
      if (response.status === 401) this.onUnauthorized?.();
      throw new EgofiApiError(response.status, code, message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Multipart upload path — the browser sets the multipart Content-Type
   * (with boundary), so we deliberately omit our JSON Content-Type header
   * while keeping auth. Used for KYB document uploads.
   */
  private async uploadRequest<T>(path: string, form: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.headers["Authorization"]) headers["Authorization"] = this.headers["Authorization"];
    if (this.headers["x-api-key"]) headers["x-api-key"] = this.headers["x-api-key"];

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: form,
    });

    if (!response.ok) {
      let code = "UNKNOWN_ERROR";
      let message = response.statusText;
      try {
        const err = (await response.json()) as { code?: string; message?: string; detail?: string };
        code = err.code ?? code;
        message = err.detail ?? err.message ?? message;
      } catch {
        // ignore parse failure
      }
      if (response.status === 401) this.onUnauthorized?.();
      throw new EgofiApiError(response.status, code, message);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  // Auth
  readonly auth = {
    login: (email: string, password: string) =>
      this.request<{ accessToken: string; merchant: MerchantProfile }>("POST", "/auth/login", {
        email,
        password,
      }),
    register: (dto: CreateMerchantDto) =>
      this.request<{ accessToken: string; merchant: MerchantProfile }>(
        "POST",
        "/auth/register",
        dto,
      ),
    me: () => this.request<MerchantProfile>("GET", "/auth/me"),
  };

  // Checkout (public, no auth needed)
  readonly checkout = {
    createSession: (dto: CreateInvoiceDto) =>
      this.request<CheckoutSessionDto>("POST", "/checkout/sessions", dto),
    getSession: (invoiceId: string) =>
      this.request<CheckoutSessionDto>("GET", `/checkout/sessions/${invoiceId}`),
    getStatus: (invoiceId: string) =>
      this.request<InvoiceStatusDto>("GET", `/checkout/sessions/${invoiceId}/status`),
    subscribeNotify: (invoiceId: string, email: string) =>
      this.request<NotifySubscriptionDto>("POST", `/checkout/sessions/${invoiceId}/notify`, {
        email,
      }),
  };

  // Invoices (merchant)
  readonly invoices = {
    create: (payload: CreateInvoicePayload) =>
      this.request<InvoiceDto>("POST", "/invoices", payload),
    list: (params?: { page?: number; limit?: number; state?: string }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ),
      ).toString();
      return this.request<{ data: InvoiceDto[]; total: number }>(
        "GET",
        `/invoices${qs ? `?${qs}` : ""}`,
      );
    },
    get: (id: string) => this.request<InvoiceDto>("GET", `/invoices/${id}`),
  };

  // Subscription plans (merchant)
  readonly subscriptions = {
    create: (payload: CreateSubscriptionPlanDto) =>
      this.request<SubscriptionPlanDto>("POST", "/subscriptions", payload),
    list: (search?: string) =>
      this.request<{ data: SubscriptionPlanDto[]; total: number }>(
        "GET",
        `/subscriptions${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      ),
    get: (id: string) => this.request<SubscriptionPlanDto>("GET", `/subscriptions/${id}`),
    delete: (id: string) => this.request<{ ok: boolean }>("DELETE", `/subscriptions/${id}`),
  };

  // Merchant settings
  readonly merchant = {
    getProfile: () => this.request<MerchantProfile>("GET", "/merchant/profile"),
    updateProfile: (dto: UpdateProfileDto) =>
      this.request<MerchantProfile>("PATCH", "/merchant/profile", dto),
    updateSettlement: (dto: UpdateSettlementDto) =>
      this.request<MerchantProfile>("PATCH", "/merchant/settlement", dto),
    createApiKey: (name: string) =>
      this.request<{ key: string; id: string; name: string }>("POST", "/merchant/api-keys", {
        name,
      }),
    listApiKeys: () =>
      this.request<Array<{ id: string; name: string; createdAt: string }>>(
        "GET",
        "/merchant/api-keys",
      ),
    deleteApiKey: (id: string) => this.request<void>("DELETE", `/merchant/api-keys/${id}`),

    // Gateway integration (webhook / IPN)
    getIntegration: () => this.request<IntegrationSettingsDto>("GET", "/merchant/integration"),
    setWebhookUrl: (webhookUrl: string) =>
      this.request<IntegrationSettingsDto>("PATCH", "/merchant/webhook", { webhookUrl }),
    rotateIpnSecret: () => this.request<{ ipnSecret: string }>("POST", "/merchant/ipn-secret"),
  };

  // KYB (merchant)
  readonly kyb = {
    getOverview: () => this.request<KybOverview>("GET", "/merchant/kyb"),
    uploadDocument: (type: KybDocumentType, file: File) => {
      const form = new FormData();
      form.append("file", file);
      return this.uploadRequest<KybDocumentDto>(
        `/merchant/kyb/documents?type=${encodeURIComponent(type)}`,
        form,
      );
    },
    deleteDocument: (id: string) =>
      this.request<{ ok: boolean }>("DELETE", `/merchant/kyb/documents/${id}`),
    submit: () => this.request<KybOverview>("POST", "/merchant/kyb/submit"),
  };

  // Admin
  readonly admin = {
    login: (email: string, password: string) =>
      this.request<{ accessToken: string }>("POST", "/auth/admin/login", {
        email,
        password,
      }),
    listMerchants: (params?: { status?: string; page?: number }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ),
      ).toString();
      return this.request<{ data: MerchantProfile[]; total: number }>(
        "GET",
        `/admin/merchants${qs ? `?${qs}` : ""}`,
      );
    },
    approveMerchant: (id: string) =>
      this.request<MerchantProfile>("POST", `/admin/merchants/${id}/approve`),
    suspendMerchant: (id: string, reason: string) =>
      this.request<MerchantProfile>("POST", `/admin/merchants/${id}/suspend`, { reason }),
    getFeePolicy: () => this.request<FeePolicy>("GET", "/admin/fee-policy"),
    updateFeePolicy: (policy: Partial<FeePolicy>) =>
      this.request<FeePolicy>("PATCH", "/admin/fee-policy", policy),

    // KYB review
    listPendingKyb: () => this.request<KybReviewItem[]>("GET", "/admin/kyb/pending"),
    getKybDocumentUrl: (documentId: string) =>
      this.request<{ url: string }>("GET", `/admin/kyb/documents/${documentId}/url`),
    approveKyb: (merchantId: string, tier: number, note?: string) =>
      this.request<void>("POST", `/admin/kyb/merchants/${merchantId}/approve`, {
        tier,
        ...(note ? { note } : {}),
      }),
    rejectKyb: (merchantId: string, note: string) =>
      this.request<void>("POST", `/admin/kyb/merchants/${merchantId}/reject`, { note }),
  };
}
