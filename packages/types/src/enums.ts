export enum RailType {
  DirectTransfer = "DIRECT_TRANSFER",
  SwapProvider = "SWAP_PROVIDER",
  WalletConnect = "WALLET_CONNECT",
  Recurring = "RECURRING",
}

export enum RailStatus {
  Awaiting = "AWAITING",
  Received = "RECEIVED",
  Converting = "CONVERTING",
  PayoutSent = "PAYOUT_SENT",
  Settled = "SETTLED",
  Underpaid = "UNDERPAID",
  Failed = "FAILED",
  Refunded = "REFUNDED",
  Expired = "EXPIRED",
}

export enum InvoiceState {
  Draft = "DRAFT",
  AwaitingPayment = "AWAITING_PAYMENT",
  Received = "RECEIVED",
  Converting = "CONVERTING",
  ComplianceHold = "COMPLIANCE_HOLD",
  PayoutSent = "PAYOUT_SENT",
  PaidConfirmed = "PAID_CONFIRMED",
  Underpaid = "UNDERPAID",
  Overpaid = "OVERPAID",
  Failed = "FAILED",
  Refunded = "REFUNDED",
  Expired = "EXPIRED",
  Cooldown = "COOLDOWN",
}

export enum ChainFamily {
  EVM = "EVM",
  Tron = "TRON",
  Solana = "SOLANA",
  Bitcoin = "BITCOIN",
}

export enum Chain {
  Ethereum = "ETHEREUM",
  BSC = "BSC",
  Polygon = "POLYGON",
  Base = "BASE",
  Tron = "TRON",
  Solana = "SOLANA",
  Bitcoin = "BITCOIN",
}

export enum PaymentEventType {
  DepositDetected = "DEPOSIT_DETECTED",
  DepositConfirmed = "DEPOSIT_CONFIRMED",
  DepositReorged = "DEPOSIT_REORGED",
  ConversionStarted = "CONVERSION_STARTED",
  ComplianceHold = "COMPLIANCE_HOLD",
  ComplianceHoldReleased = "COMPLIANCE_HOLD_RELEASED",
  PayoutSent = "PAYOUT_SENT",
  PayoutConfirmed = "PAYOUT_CONFIRMED",
  Underpaid = "UNDERPAID",
  Failed = "FAILED",
  Refunded = "REFUNDED",
  Expired = "EXPIRED",
}

export enum PaymentLeg {
  Deposit = "deposit",
  Payout = "payout",
}

export enum LedgerEntryKind {
  Fee = "fee",
  Payout = "payout",
  Refund = "refund",
}

export enum FeeMechanismStatus {
  Active = "active",
  Deprecating = "deprecating",
  Disabled = "disabled",
}

export enum RecurringAuthModel {
  ApproveAndPull = "APPROVE_AND_PULL",
  SessionKeys = "SESSION_KEYS",
  Streaming = "STREAMING",
}

export enum RecurringEngine {
  InHouse = "IN_HOUSE",
  Sphere = "SPHERE",
  LoopCrypto = "LOOP_CRYPTO",
  Radom = "RADOM",
}

export enum WebhookEvent {
  InvoiceCreated = "invoice.created",
  InvoicePaid = "invoice.paid",
  InvoiceFailed = "invoice.failed",
  InvoiceExpired = "invoice.expired",
  InvoiceUnderpaid = "invoice.underpaid",
  InvoiceRefunded = "invoice.refunded",
  InvoiceComplianceHold = "invoice.compliance_hold",
}

export enum KybStatus {
  Pending = "PENDING",
  UnderReview = "UNDER_REVIEW",
  Verified = "VERIFIED",
  Rejected = "REJECTED",
}

export enum KybDocumentType {
  BusinessRegistration = "BUSINESS_REGISTRATION",
  TaxId = "TAX_ID",
  DirectorId = "DIRECTOR_ID",
  ProofOfAddress = "PROOF_OF_ADDRESS",
  BankStatement = "BANK_STATEMENT",
  Other = "OTHER",
}

export enum KybDocumentStatus {
  Pending = "PENDING",
  Approved = "APPROVED",
  Rejected = "REJECTED",
}

export enum OutboxStatus {
  Pending = "pending",
  Delivered = "delivered",
  Dead = "dead",
}

export enum UnmatchedPaymentStatus {
  Open = "open",
  Resolved = "resolved",
  Returned = "returned",
}

export enum ScreeningVerdict {
  Clear = "CLEAR",
  Flagged = "FLAGGED",
  Sanctioned = "SANCTIONED",
}

export enum UserRole {
  Merchant = "MERCHANT",
  Admin = "ADMIN",
  SuperAdmin = "SUPER_ADMIN",
}

export enum MerchantStatus {
  Pending = "PENDING",
  Active = "ACTIVE",
  Suspended = "SUSPENDED",
  Rejected = "REJECTED",
}

export enum SwapProviderName {
  ChangeNOW = "CHANGENOW",
  SimpleSwap = "SIMPLESWAP",
}

export enum RateType {
  Fixed = "fixed",
  Float = "float",
}

export enum SettlementAsset {
  USDT_Tron = "USDT-TRC20",
  USDT_BSC = "USDT-BEP20",
  USDT_Polygon = "USDT-ERC20-POLYGON",
  USDC_Solana = "USDC-SOL",
  USDC_Base = "USDC-BASE",
}
