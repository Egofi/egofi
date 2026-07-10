import type {
  CheckoutSessionDto,
  CreateInvoiceDto,
  CreateInvoicePayload,
  CreateMerchantDto,
  CreateSubscriptionPlanDto,
  FeePolicy,
  InvoiceDto,
  InvoiceEventDto,
  InvoiceStatusDto,
  KybDocumentDto,
  KybOverview,
  MerchantProfile,
  PublicPlanDto,
  SubscribeDto,
  SubscribeResultDto,
  SubscriptionDto,
  SubscriptionPlanDto,
  UpdateSettlementDto,
  UpdateSubscriptionPlanDto,
} from "@egofi/types";
import {
  InvoiceState,
  KybDocumentStatus,
  type KybDocumentType,
  KybStatus,
  SubscriptionStatus,
} from "@egofi/types";
import {
  MOCK_API_KEYS,
  MOCK_CHECKOUT_TIMINGS,
  MOCK_FEE_POLICY,
  MOCK_INVOICES,
  MOCK_KYB_TIERS,
  MOCK_MERCHANT,
  MOCK_MERCHANTS_LIST,
  buildMockCheckoutSession,
  getMockCheckoutState,
} from "./mock-data.js";

function delay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 200));
}

let invoiceCounter = MOCK_INVOICES.length;
const inMemoryInvoices: InvoiceDto[] = [...MOCK_INVOICES];
let currentMerchant: MerchantProfile = { ...MOCK_MERCHANT };
const apiKeys = [...MOCK_API_KEYS];
let mockMerchants = [...MOCK_MERCHANTS_LIST];
let mockIpnSecret: string | null = null;
const mockSubscriptionPlans: SubscriptionPlanDto[] = [];
const mockSubscriptions: SubscriptionDto[] = [];
let subscriptionCounter = 0;
const mockKybDocuments: KybDocumentDto[] = [];
let mockKybStatus: KybStatus = KybStatus.Pending;
let mockKybSubmittedAt: string | null = null;

export class MockEgofiClient {
  /** Parity with EgofiClient — never fired in mock mode. */
  onUnauthorized?: () => void;

  readonly auth = {
    login: async (_email: string, _password: string) => {
      await delay(500);
      return { accessToken: "mock_jwt_token_abc123", merchant: currentMerchant };
    },

    register: async (dto: CreateMerchantDto) => {
      await delay(600);
      currentMerchant = {
        ...MOCK_MERCHANT,
        business: dto.business,
        email: dto.email,
        settlementAsset: dto.settlementAsset,
        settlementAddresses: dto.settlementAddresses,
      };
      return { accessToken: "mock_jwt_token_abc123", merchant: currentMerchant };
    },

    me: async (): Promise<MerchantProfile> => {
      await delay(200);
      return currentMerchant;
    },
  };

  readonly checkout = {
    createSession: async (dto: CreateInvoiceDto): Promise<CheckoutSessionDto> => {
      await delay(600);
      const id = `inv_mock_${String(++invoiceCounter).padStart(3, "0")}`;
      MOCK_CHECKOUT_TIMINGS[id] = Date.now();

      const session = buildMockCheckoutSession(
        id,
        dto.payAsset,
        dto.payChain,
        dto.displayAmount,
        dto.displayCurrency,
      );

      inMemoryInvoices.unshift(session.invoice);
      return session;
    },

    getSession: async (invoiceId: string): Promise<CheckoutSessionDto> => {
      await delay(250);
      const existing = inMemoryInvoices.find((i) => i.id === invoiceId);
      if (!existing) {
        return buildMockCheckoutSession(invoiceId);
      }
      const _state = getMockCheckoutState(invoiceId);
      return buildMockCheckoutSession(
        invoiceId,
        existing.payAsset,
        existing.payChain,
        existing.displayAmount,
        existing.displayCurrency,
      );
    },

    getStatus: async (invoiceId: string): Promise<InvoiceStatusDto> => {
      await delay(150);
      const state = getMockCheckoutState(invoiceId);
      return {
        invoiceId,
        state,
        ...(state !== InvoiceState.AwaitingPayment
          ? { depositTxHash: "0xmocktxhash1234567890abcdef" }
          : {}),
        ...(state === InvoiceState.PayoutSent || state === InvoiceState.PaidConfirmed
          ? { payoutTxHash: "TRmockpayouttx1234567890abcdef" }
          : {}),
        updatedAt: new Date().toISOString(),
      };
    },

    subscribeNotify: async (_invoiceId: string, email: string) => {
      await delay(400);
      return { ok: true, email: email.trim().toLowerCase() };
    },
  };

  readonly invoices = {
    create: async (dto: CreateInvoicePayload): Promise<InvoiceDto> => {
      await delay(500);
      const id = `inv_mock_${String(++invoiceCounter).padStart(3, "0")}`;
      const invoice: InvoiceDto = {
        id,
        merchantId: currentMerchant.id,
        displayCurrency: dto.displayCurrency,
        displayAmount: dto.displayAmount,
        payAsset: dto.payAsset,
        payChain: dto.payChain,
        quotedAmount: dto.displayAmount,
        rate: "1.000000",
        rateLockedUntil: new Date(Date.now() + 15 * 60_000).toISOString(),
        rail: "DIRECT_TRANSFER" as never,
        railRef: null,
        state: InvoiceState.AwaitingPayment,
        refundAddress: dto.refundAddress ?? null,
        subscriptionId: null,
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      inMemoryInvoices.unshift(invoice);
      return invoice;
    },

    list: async (params?: {
      page?: number;
      limit?: number;
      state?: string;
    }): Promise<{ data: InvoiceDto[]; total: number }> => {
      await delay(300);
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      const filtered = params?.state
        ? inMemoryInvoices.filter((i) => i.state === params.state)
        : inMemoryInvoices;
      const start = (page - 1) * limit;
      return {
        data: filtered.slice(start, start + limit),
        total: filtered.length,
      };
    },

    get: async (id: string): Promise<InvoiceDto> => {
      await delay(200);
      const invoice = inMemoryInvoices.find((i) => i.id === id);
      if (!invoice) throw new Error(`Invoice ${id} not found`);
      return invoice;
    },

    events: async (id: string): Promise<InvoiceEventDto[]> => {
      await delay(250);
      const state = getMockCheckoutState(id);
      const base = Date.now() - 20 * 60_000;
      const timeline: InvoiceEventDto[] = [
        {
          id: `evt_${id}_1`,
          type: "state.issue",
          rail: "DIRECT_TRANSFER",
          txHash: null,
          leg: null,
          amount: null,
          asset: null,
          chain: null,
          ts: new Date(base).toISOString(),
        },
      ];
      if (state !== InvoiceState.AwaitingPayment) {
        timeline.push({
          id: `evt_${id}_2`,
          type: "DEPOSIT_DETECTED",
          rail: "DIRECT_TRANSFER",
          txHash: "0xmocktxhash1234567890abcdef",
          leg: "deposit",
          amount: "25.03",
          asset: "USDT",
          chain: "TRON",
          ts: new Date(base + 5 * 60_000).toISOString(),
        });
      }
      if (state === InvoiceState.PaidConfirmed) {
        timeline.push({
          id: `evt_${id}_3`,
          type: "state.confirm",
          rail: "DIRECT_TRANSFER",
          txHash: "TRmockpayouttx1234567890abcdef",
          leg: "payout",
          amount: "25.03",
          asset: "USDT",
          chain: "TRON",
          ts: new Date(base + 9 * 60_000).toISOString(),
        });
      }
      return timeline;
    },
  };

  readonly subscriptions = {
    create: async (payload: CreateSubscriptionPlanDto): Promise<SubscriptionPlanDto> => {
      await delay(500);
      const now = new Date().toISOString();
      const plan: SubscriptionPlanDto = {
        id: `sub_mock_${String(++subscriptionCounter).padStart(4, "0")}`,
        merchantId: currentMerchant.id,
        title: payload.title.trim(),
        periodDuration: payload.periodDuration,
        periodUnit: payload.periodUnit,
        costPerPeriod: payload.costPerPeriod,
        currency: (payload.currency ?? "USD").toUpperCase(),
        ipnCallbackUrl: payload.ipnCallbackUrl?.trim() || null,
        successUrl: payload.successUrl?.trim() || null,
        failedUrl: payload.failedUrl?.trim() || null,
        partialUrl: payload.partialUrl?.trim() || null,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      mockSubscriptionPlans.unshift(plan);
      return plan;
    },

    list: async (search?: string): Promise<{ data: SubscriptionPlanDto[]; total: number }> => {
      await delay(250);
      const q = search?.trim().toLowerCase();
      const data = q
        ? mockSubscriptionPlans.filter(
            (p) => p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
          )
        : mockSubscriptionPlans;
      return { data: [...data], total: data.length };
    },

    get: async (id: string): Promise<SubscriptionPlanDto> => {
      await delay(200);
      const plan = mockSubscriptionPlans.find((p) => p.id === id);
      if (!plan) throw new Error(`Subscription plan ${id} not found`);
      return plan;
    },

    update: async (
      id: string,
      payload: UpdateSubscriptionPlanDto,
    ): Promise<SubscriptionPlanDto> => {
      await delay(400);
      const plan = mockSubscriptionPlans.find((p) => p.id === id);
      if (!plan) throw new Error(`Subscription plan ${id} not found`);
      Object.assign(plan, payload, { updatedAt: new Date().toISOString() });
      return plan;
    },

    delete: async (id: string): Promise<{ ok: boolean }> => {
      await delay(300);
      const idx = mockSubscriptionPlans.findIndex((p) => p.id === id);
      if (idx !== -1) mockSubscriptionPlans.splice(idx, 1);
      return { ok: true };
    },

    listSubscribers: async (
      planId: string,
    ): Promise<{ data: SubscriptionDto[]; total: number }> => {
      await delay(300);
      const data = mockSubscriptions.filter((s) => s.planId === planId);
      return { data: [...data], total: data.length };
    },

    cancelSubscriber: async (subscriptionId: string): Promise<SubscriptionDto> => {
      await delay(350);
      const sub = mockSubscriptions.find((s) => s.id === subscriptionId);
      if (!sub) throw new Error(`Subscription ${subscriptionId} not found`);
      sub.status = SubscriptionStatus.Canceled;
      sub.canceledAt = new Date().toISOString();
      return sub;
    },
  };

  readonly publicPlans = {
    get: async (planId: string): Promise<PublicPlanDto> => {
      await delay(250);
      const plan = mockSubscriptionPlans.find((p) => p.id === planId);
      if (!plan) throw new Error(`Subscription plan ${planId} not found`);
      return {
        id: plan.id,
        title: plan.title,
        periodDuration: plan.periodDuration,
        periodUnit: plan.periodUnit,
        costPerPeriod: plan.costPerPeriod,
        currency: plan.currency,
        active: plan.active,
        merchantBusiness: currentMerchant.business,
      };
    },

    subscribe: async (planId: string, payload: SubscribeDto): Promise<SubscribeResultDto> => {
      await delay(700);
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 3600_000);
      const sub: SubscriptionDto = {
        id: `subr_mock_${Date.now()}`,
        planId,
        merchantId: currentMerchant.id,
        customerEmail: payload.customerEmail.toLowerCase(),
        payAsset: payload.payAsset,
        payChain: payload.payChain,
        status: SubscriptionStatus.Active,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        nextBillingAt: periodEnd.toISOString(),
        canceledAt: null,
        createdAt: now.toISOString(),
        invoiceCount: 1,
      };
      mockSubscriptions.unshift(sub);
      const id = `inv_mock_${String(++invoiceCounter).padStart(3, "0")}`;
      MOCK_CHECKOUT_TIMINGS[id] = Date.now();
      return { subscription: sub, invoiceId: id };
    },
  };

  readonly merchant = {
    getProfile: async (): Promise<MerchantProfile> => {
      await delay(250);
      return currentMerchant;
    },

    updateProfile: async (dto: { business?: string }): Promise<MerchantProfile> => {
      await delay(400);
      currentMerchant = {
        ...currentMerchant,
        ...(dto.business ? { business: dto.business } : {}),
      };
      return currentMerchant;
    },

    updateSettlement: async (dto: UpdateSettlementDto): Promise<MerchantProfile> => {
      await delay(400);
      currentMerchant = {
        ...currentMerchant,
        ...(dto.settlementAsset ? { settlementAsset: dto.settlementAsset } : {}),
        ...(dto.settlementAddresses ? { settlementAddresses: dto.settlementAddresses } : {}),
        ...(dto.xpub !== undefined ? { xpub: dto.xpub } : {}),
        ...(dto.xpubMode !== undefined ? { xpubMode: dto.xpubMode } : {}),
        ...(dto.webhookUrl !== undefined ? { webhookUrl: dto.webhookUrl } : {}),
      };
      return currentMerchant;
    },

    createApiKey: async (name: string) => {
      await delay(400);
      const key = {
        id: `key_mock_${Date.now()}`,
        name,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
      };
      apiKeys.push(key);
      return { key: `egofi_mock_${Math.random().toString(36).slice(2)}`, ...key };
    },

    listApiKeys: async () => {
      await delay(200);
      return [...apiKeys];
    },

    deleteApiKey: async (id: string) => {
      await delay(300);
      const idx = apiKeys.findIndex((k) => k.id === id);
      if (idx !== -1) apiKeys.splice(idx, 1);
    },

    getIntegration: async () => {
      await delay(200);
      return {
        webhookUrl: currentMerchant.webhookUrl ?? null,
        ipnSecret: mockIpnSecret,
      };
    },

    setWebhookUrl: async (webhookUrl: string) => {
      await delay(350);
      const url = webhookUrl.trim();
      if (url) {
        currentMerchant = { ...currentMerchant, webhookUrl: url };
      } else {
        const { webhookUrl: _omit, ...rest } = currentMerchant;
        currentMerchant = rest;
      }
      return {
        webhookUrl: currentMerchant.webhookUrl ?? null,
        ipnSecret: mockIpnSecret,
      };
    },

    rotateIpnSecret: async () => {
      await delay(350);
      mockIpnSecret = `whsec_mock_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      return { ipnSecret: mockIpnSecret };
    },
  };

  readonly kyb = {
    getOverview: async (): Promise<KybOverview> => {
      await delay(250);
      return {
        status: mockKybStatus,
        tier: currentMerchant.kybTier,
        submittedAt: mockKybSubmittedAt,
        reviewNote: null,
        documents: [...mockKybDocuments],
        tiers: MOCK_KYB_TIERS,
      };
    },

    uploadDocument: async (type: KybDocumentType, file: File): Promise<KybDocumentDto> => {
      await delay(700);
      const doc: KybDocumentDto = {
        id: `kybdoc_mock_${Date.now()}`,
        type,
        status: KybDocumentStatus.Pending,
        originalFilename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewNote: null,
      };
      // Replace any existing doc of the same type
      const idx = mockKybDocuments.findIndex((d) => d.type === type);
      if (idx !== -1) mockKybDocuments.splice(idx, 1);
      mockKybDocuments.push(doc);
      return doc;
    },

    deleteDocument: async (id: string): Promise<{ ok: boolean }> => {
      await delay(300);
      const idx = mockKybDocuments.findIndex((d) => d.id === id);
      if (idx !== -1) mockKybDocuments.splice(idx, 1);
      return { ok: true };
    },

    submit: async (): Promise<KybOverview> => {
      await delay(500);
      mockKybStatus = KybStatus.UnderReview;
      mockKybSubmittedAt = new Date().toISOString();
      return {
        status: mockKybStatus,
        tier: currentMerchant.kybTier,
        submittedAt: mockKybSubmittedAt,
        reviewNote: null,
        documents: [...mockKybDocuments],
        tiers: MOCK_KYB_TIERS,
      };
    },
  };

  readonly admin = {
    login: async (_email: string, _password: string) => {
      await delay(400);
      return { accessToken: "mock_admin_jwt_token" };
    },
    listMerchants: async (params?: { status?: string; page?: number }) => {
      await delay(350);
      const filtered = params?.status
        ? mockMerchants.filter((m) => m.status === params.status)
        : mockMerchants;
      return { data: filtered, total: filtered.length };
    },

    approveMerchant: async (id: string): Promise<MerchantProfile> => {
      await delay(400);
      mockMerchants = mockMerchants.map((m) =>
        m.id === id ? { ...m, status: "ACTIVE" as never } : m,
      );
      const merchant = mockMerchants.find((m) => m.id === id);
      if (!merchant) throw new Error(`Merchant ${id} not found`);
      return merchant;
    },

    suspendMerchant: async (id: string, _reason: string): Promise<MerchantProfile> => {
      await delay(400);
      mockMerchants = mockMerchants.map((m) =>
        m.id === id ? { ...m, status: "SUSPENDED" as never } : m,
      );
      const merchant = mockMerchants.find((m) => m.id === id);
      if (!merchant) throw new Error(`Merchant ${id} not found`);
      return merchant;
    },

    getFeePolicy: async (): Promise<FeePolicy> => {
      await delay(200);
      return { ...MOCK_FEE_POLICY };
    },

    updateFeePolicy: async (policy: Partial<FeePolicy>): Promise<FeePolicy> => {
      await delay(400);
      return { ...MOCK_FEE_POLICY, ...policy };
    },

    listPendingKyb: async () => {
      await delay(300);
      return mockMerchants
        .filter((m) => m.kybStatus === KybStatus.UnderReview)
        .map((m) => ({
          merchantId: m.id,
          business: m.business,
          email: m.email,
          status: m.kybStatus,
          currentTier: m.kybTier,
          submittedAt: new Date(Date.now() - 3_600_000).toISOString(),
          documents: [...mockKybDocuments],
        }));
    },
    getKybDocumentUrl: async (_documentId: string) => {
      await delay(200);
      return { url: "https://example.com/mock-signed-document-url" };
    },
    approveKyb: async (_merchantId: string, _tier: number, _note?: string) => {
      await delay(400);
    },
    rejectKyb: async (_merchantId: string, _note: string) => {
      await delay(400);
    },
  };

  // Matching EgofiClient API — no-op in mock mode
  setAuthToken(_token: string): void {}
}
