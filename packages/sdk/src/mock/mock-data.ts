import type {
  CheckoutSessionDto,
  FeePolicy,
  InvoiceDto,
  KybTierInfo,
  MerchantProfile,
} from "@egofi/types";
import {
  FeeMechanismStatus,
  InvoiceState,
  KybDocumentType,
  KybStatus,
  MerchantStatus,
  RailType,
} from "@egofi/types";

export const MOCK_MERCHANT: MerchantProfile = {
  id: "mock_merchant_001",
  business: "Acme Store",
  email: "merchant@acme.ng",
  status: MerchantStatus.Active,
  kybStatus: KybStatus.Pending,
  kybTier: 0,
  settlementAsset: "USDT-TRC20",
  settlementAddresses: {
    evm: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    tron: "TJYeasTPa6gpR4vF4ycuPCRbXfRBXgqVXK",
    solana: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    bitcoin: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  },
  xpubMode: false,
  webhookUrl: "https://acme.ng/webhooks/egofi",
  createdAt: new Date("2026-01-15T09:00:00Z"),
};

export const MOCK_ADMIN_MERCHANT = {
  ...MOCK_MERCHANT,
  id: "mock_merchant_002",
  business: "Lagos Tech Hub",
  email: "pay@lagostechweb.com",
  status: MerchantStatus.Pending,
  kybStatus: KybStatus.UnderReview,
  kybTier: 0,
};

export const MOCK_INVOICES: InvoiceDto[] = [
  {
    id: "inv_mock_001",
    merchantId: MOCK_MERCHANT.id,
    displayCurrency: "USD",
    displayAmount: "150.00",
    payAsset: "USDT-TRC20",
    payChain: "TRON",
    quotedAmount: "150.000000",
    rate: "1.000000",
    rateLockedUntil: new Date(Date.now() + 15 * 60_000).toISOString(),
    rail: RailType.DirectTransfer,
    railRef: null,
    state: InvoiceState.PaidConfirmed,
    refundAddress: null,
    subscriptionId: null,
    expiresAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    createdAt: new Date(Date.now() - 35 * 60_000).toISOString(),
  },
  {
    id: "inv_mock_002",
    merchantId: MOCK_MERCHANT.id,
    displayCurrency: "USD",
    displayAmount: "75.50",
    payAsset: "BNB",
    payChain: "BSC",
    quotedAmount: "0.127460",
    rate: "592.76",
    rateLockedUntil: new Date(Date.now() + 10 * 60_000).toISOString(),
    rail: RailType.SwapProvider,
    railRef: "changenow_abc123",
    state: InvoiceState.Converting,
    refundAddress: "0xRefundAddr123",
    subscriptionId: null,
    expiresAt: new Date(Date.now() + 25 * 60_000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  {
    id: "inv_mock_003",
    merchantId: MOCK_MERCHANT.id,
    displayCurrency: "USD",
    displayAmount: "200.00",
    payAsset: "SOL",
    payChain: "SOLANA",
    quotedAmount: "1.234567",
    rate: "162.02",
    rateLockedUntil: new Date(Date.now() + 5 * 60_000).toISOString(),
    rail: RailType.SwapProvider,
    railRef: null,
    state: InvoiceState.AwaitingPayment,
    refundAddress: null,
    subscriptionId: null,
    expiresAt: new Date(Date.now() + 28 * 60_000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    id: "inv_mock_004",
    merchantId: MOCK_MERCHANT.id,
    displayCurrency: "NGN",
    displayAmount: "120000.00",
    payAsset: "BTC",
    payChain: "BITCOIN",
    quotedAmount: "0.00147823",
    rate: "81175000",
    rateLockedUntil: new Date(Date.now() - 20 * 60_000).toISOString(),
    rail: RailType.DirectTransfer,
    railRef: null,
    state: InvoiceState.Expired,
    refundAddress: null,
    subscriptionId: null,
    expiresAt: new Date(Date.now() - 10 * 60_000).toISOString(),
    createdAt: new Date(Date.now() - 40 * 60_000).toISOString(),
  },
  {
    id: "inv_mock_005",
    merchantId: MOCK_MERCHANT.id,
    displayCurrency: "USD",
    displayAmount: "50.00",
    payAsset: "ETH",
    payChain: "ETHEREUM",
    quotedAmount: "0.018520",
    rate: "2700.32",
    rateLockedUntil: new Date(Date.now() + 12 * 60_000).toISOString(),
    rail: RailType.SwapProvider,
    railRef: "changenow_xyz789",
    state: InvoiceState.Failed,
    refundAddress: "0xRefundEth456",
    subscriptionId: null,
    expiresAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    createdAt: new Date(Date.now() - 35 * 60_000).toISOString(),
  },
];

export const MOCK_API_KEYS = [
  {
    id: "key_001",
    name: "Production API",
    createdAt: new Date(Date.now() - 7 * 86400_000).toISOString(),
    lastUsedAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: "key_002",
    name: "Staging API",
    createdAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
    lastUsedAt: null,
  },
];

// Simulates a checkout session that auto-progresses through states.
// Keyed by invoiceId → creation timestamp
export const MOCK_CHECKOUT_TIMINGS: Record<string, number> = {};

const CHECKOUT_STATE_SEQUENCE: Array<{ state: InvoiceState; afterMs: number }> = [
  { state: InvoiceState.AwaitingPayment, afterMs: 0 },
  { state: InvoiceState.Received, afterMs: 12_000 },
  { state: InvoiceState.Converting, afterMs: 20_000 },
  { state: InvoiceState.PayoutSent, afterMs: 35_000 },
  { state: InvoiceState.PaidConfirmed, afterMs: 55_000 },
];

export function getMockCheckoutState(invoiceId: string): InvoiceState {
  const createdAt = MOCK_CHECKOUT_TIMINGS[invoiceId];
  if (!createdAt) return InvoiceState.AwaitingPayment;

  const elapsed = Date.now() - createdAt;
  let state = InvoiceState.AwaitingPayment;

  for (const step of CHECKOUT_STATE_SEQUENCE) {
    if (elapsed >= step.afterMs) state = step.state;
  }
  return state;
}

const MOCK_ADDRESSES: Record<string, string> = {
  TRON: "TJYeasTPa6gpR4vF4ycuPCRbXfRBXgqVXK",
  SOLANA: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  BITCOIN: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
};

const CHAIN_URI_SCHEME: Record<string, string> = {
  TRON: "tron",
  SOLANA: "solana",
  BITCOIN: "bitcoin",
  ETHEREUM: "ethereum",
  BSC: "ethereum",
  POLYGON: "ethereum",
  BASE: "ethereum",
};

const CHAIN_DISPLAY_NAMES: Record<string, string> = {
  ETHEREUM: "Ethereum",
  BSC: "BNB Smart Chain",
  POLYGON: "Polygon",
  BASE: "Base",
  TRON: "Tron",
  SOLANA: "Solana",
  BITCOIN: "Bitcoin",
};

export function buildMockCheckoutSession(
  invoiceId: string,
  payAsset = "USDT-TRC20",
  payChain = "TRON",
  amount = "100.00",
  currency = "USD",
): CheckoutSessionDto {
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  const rateLockedUntil = new Date(Date.now() + 15 * 60_000).toISOString();
  const chainKey = payChain.toUpperCase();
  const depositAddress = MOCK_ADDRESSES[chainKey] ?? "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const scheme = CHAIN_URI_SCHEME[chainKey] ?? "ethereum";
  const chainName = CHAIN_DISPLAY_NAMES[chainKey] ?? payChain;

  return {
    invoice: {
      id: invoiceId,
      merchantId: MOCK_MERCHANT.id,
      displayCurrency: currency,
      displayAmount: amount,
      payAsset,
      payChain,
      quotedAmount: amount,
      rate: "1.000000",
      rateLockedUntil,
      rail: payChain === "TRON" ? RailType.DirectTransfer : RailType.SwapProvider,
      railRef: payChain !== "TRON" ? "mock_changenow_ref" : null,
      state: getMockCheckoutState(invoiceId),
      refundAddress: null,
      subscriptionId: null,
      expiresAt,
      createdAt: new Date().toISOString(),
    },
    instructions: {
      depositAddress,
      exactAmount: (Number.parseFloat(amount) * 1e6).toFixed(0),
      asset: payAsset,
      chain: payChain,
      paymentUri: depositAddress,
      paymentUriWithAmount: `${scheme}:${depositAddress}?amount=${amount}`,
      qrData: depositAddress,
      expiresAt,
      rateLockedUntil,
      networkLabel: `Send ${payAsset} on the ${chainName} network`,
    },
  };
}

export const MOCK_FEE_POLICY: FeePolicy = {
  id: "global",
  providerFeeShare: {
    status: FeeMechanismStatus.Active,
    adjustablePercent: 0.4,
  },
  quoteMarkup: {
    status: FeeMechanismStatus.Deprecating,
    percent: 0,
    deprecationNote:
      "Quote markup is being phased out in favour of provider fee-share. Disable by 2026-09-01.",
    deprecationDate: "2026-09-01",
  },
  merchantSaasFee: {
    status: FeeMechanismStatus.Disabled,
    amountUsd: 0,
    intervalDays: 30,
  },
  updatedAt: new Date(Date.now() - 86400_000).toISOString(),
};

export const MOCK_MERCHANTS_LIST = [MOCK_MERCHANT, MOCK_ADMIN_MERCHANT];

export const MOCK_KYB_TIERS: KybTierInfo[] = [
  {
    tier: 0,
    label: "Starter",
    description: "Email and business details only. Good for testing and low volume.",
    volumeCapUsd: 1_000,
    requiredDocuments: [],
  },
  {
    tier: 1,
    label: "Verified Business",
    description: "Confirm your business is real and identify a director.",
    volumeCapUsd: 25_000,
    requiredDocuments: [KybDocumentType.BusinessRegistration, KybDocumentType.DirectorId],
  },
  {
    tier: 2,
    label: "Full",
    description: "Enhanced review for unlimited settlement volume.",
    volumeCapUsd: null,
    requiredDocuments: [KybDocumentType.ProofOfAddress, KybDocumentType.BankStatement],
  },
];
