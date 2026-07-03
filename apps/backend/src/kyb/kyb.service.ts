import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { KybDocument } from "@prisma/client";
import { PrismaService } from "../core/prisma.service";
import { OutboxService } from "../core/outbox.service";
import { CloudinaryService } from "./cloudinary.service";
import {
  KYB_TIERS,
  MINIMUM_SUBMISSION_DOCS,
} from "./kyb.tiers";
import {
  KybDocumentStatus,
  KybDocumentType,
  KybStatus,
} from "@egofi/types";
import type {
  KybDocumentDto,
  KybOverview,
  KybReviewItem,
} from "@egofi/types";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_DOCS_PER_MERCHANT = 12;

@Injectable()
export class KybService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly outbox: OutboxService,
  ) {}

  // ── Merchant ────────────────────────────────────────────────────

  async getOverview(merchantId: string): Promise<KybOverview> {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: {
        kybStatus: true,
        kybTier: true,
        kybSubmittedAt: true,
        kybReviewNote: true,
      },
    });
    const documents = await this.prisma.kybDocument.findMany({
      where: { merchantId },
      orderBy: { uploadedAt: "asc" },
    });

    return {
      status: merchant.kybStatus as KybStatus,
      tier: merchant.kybTier,
      submittedAt: merchant.kybSubmittedAt?.toISOString() ?? null,
      reviewNote: merchant.kybReviewNote,
      documents: documents.map(toDocumentDto),
      tiers: KYB_TIERS,
    };
  }

  async uploadDocument(
    merchantId: string,
    type: KybDocumentType,
    file: { buffer: Buffer; filename: string; mimeType: string },
  ): Promise<KybDocumentDto> {
    if (!Object.values(KybDocumentType).includes(type)) {
      throw new BadRequestException(`Unknown document type: ${type}`);
    }
    if (!ALLOWED_MIME.has(file.mimeType)) {
      throw new BadRequestException(
        "Unsupported file type. Upload a PDF or an image (JPEG, PNG, WEBP, HEIC).",
      );
    }
    if (file.buffer.length === 0) {
      throw new BadRequestException("The uploaded file is empty.");
    }
    if (file.buffer.length > MAX_BYTES) {
      throw new BadRequestException("File is too large. The limit is 10 MB.");
    }

    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: { kybStatus: true },
    });
    if (merchant.kybStatus === KybStatus.UnderReview) {
      throw new ForbiddenException(
        "Your documents are under review. Wait for the outcome before changing them.",
      );
    }

    const count = await this.prisma.kybDocument.count({ where: { merchantId } });
    if (count >= MAX_DOCS_PER_MERCHANT) {
      throw new BadRequestException(
        "You've reached the maximum number of documents. Remove one before adding another.",
      );
    }

    const upload = await this.cloudinary.uploadPrivate(file.buffer, {
      merchantId,
      documentType: type,
      mimeType: file.mimeType,
    });

    // Replacing a document of the same type: retire the old one so the review
    // queue only ever shows the latest of each kind.
    const previous = await this.prisma.kybDocument.findFirst({
      where: { merchantId, type, status: { not: KybDocumentStatus.Approved } },
    });
    if (previous) {
      await this.cloudinary.destroy(
        previous.cloudinaryPublicId,
        previous.cloudinaryResourceType,
      );
      await this.prisma.kybDocument.delete({ where: { id: previous.id } });
    }

    const doc = await this.prisma.kybDocument.create({
      data: {
        merchantId,
        type,
        status: KybDocumentStatus.Pending,
        cloudinaryPublicId: upload.publicId,
        cloudinaryResourceType: upload.resourceType,
        originalFilename: file.filename,
        mimeType: file.mimeType,
        sizeBytes: file.buffer.length,
      },
    });
    return toDocumentDto(doc);
  }

  async deleteDocument(merchantId: string, documentId: string): Promise<void> {
    const doc = await this.prisma.kybDocument.findFirst({
      where: { id: documentId, merchantId },
    });
    if (!doc) throw new NotFoundException("Document not found.");

    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: { kybStatus: true },
    });
    if (merchant.kybStatus === KybStatus.UnderReview) {
      throw new ForbiddenException(
        "Your documents are under review and can't be changed right now.",
      );
    }

    await this.cloudinary.destroy(doc.cloudinaryPublicId, doc.cloudinaryResourceType);
    await this.prisma.kybDocument.delete({ where: { id: doc.id } });
  }

  async submit(merchantId: string): Promise<KybOverview> {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: { kybStatus: true },
    });
    if (merchant.kybStatus === KybStatus.UnderReview) {
      throw new BadRequestException("Your KYB is already under review.");
    }

    const documents = await this.prisma.kybDocument.findMany({
      where: { merchantId },
      select: { type: true },
    });
    const uploaded = new Set(documents.map((d) => d.type));
    const missing = MINIMUM_SUBMISSION_DOCS.filter((t) => !uploaded.has(t));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Upload the required documents before submitting: ${missing
          .map(documentLabel)
          .join(", ")}.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.merchant.update({
        where: { id: merchantId },
        data: {
          kybStatus: KybStatus.UnderReview,
          kybSubmittedAt: new Date(),
          kybReviewNote: null,
        },
      });
      await this.outbox.emit(tx, {
        aggregate: "merchant",
        aggregateId: merchantId,
        type: "kyb.submitted",
        payload: { merchantId },
      });
    });

    return this.getOverview(merchantId);
  }

  // ── Admin review ────────────────────────────────────────────────

  async listPending(): Promise<KybReviewItem[]> {
    const merchants = await this.prisma.merchant.findMany({
      where: { kybStatus: KybStatus.UnderReview },
      orderBy: { kybSubmittedAt: "asc" },
      select: {
        id: true,
        business: true,
        email: true,
        kybStatus: true,
        kybTier: true,
        kybSubmittedAt: true,
        kybDocuments: { orderBy: { uploadedAt: "asc" } },
      },
    });

    return merchants.map((m) => ({
      merchantId: m.id,
      business: m.business,
      email: m.email,
      status: m.kybStatus as KybStatus,
      currentTier: m.kybTier,
      submittedAt: m.kybSubmittedAt?.toISOString() ?? null,
      documents: m.kybDocuments.map(toDocumentDto),
    }));
  }

  /** Short-lived signed URL so an operator can view one private document. */
  async getDocumentViewUrl(documentId: string): Promise<{ url: string }> {
    const doc = await this.prisma.kybDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException("Document not found.");
    return {
      url: this.cloudinary.signedUrl(doc.cloudinaryPublicId, doc.cloudinaryResourceType),
    };
  }

  async approve(merchantId: string, tier: number, note?: string): Promise<void> {
    if (![0, 1, 2].includes(tier)) {
      throw new BadRequestException("Tier must be 0, 1, or 2.");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.merchant.update({
        where: { id: merchantId },
        data: {
          kybStatus: KybStatus.Verified,
          kybTier: tier,
          kybReviewNote: note ?? null,
        },
      });
      await tx.kybDocument.updateMany({
        where: { merchantId, status: KybDocumentStatus.Pending },
        data: { status: KybDocumentStatus.Approved, reviewedAt: new Date() },
      });
      await this.outbox.emit(tx, {
        aggregate: "merchant",
        aggregateId: merchantId,
        type: "kyb.verified",
        payload: { merchantId, tier },
      });
    });
  }

  async reject(merchantId: string, note: string): Promise<void> {
    if (!note?.trim()) {
      throw new BadRequestException("A reason is required when rejecting KYB.");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.merchant.update({
        where: { id: merchantId },
        data: { kybStatus: KybStatus.Rejected, kybReviewNote: note },
      });
      await tx.kybDocument.updateMany({
        where: { merchantId, status: KybDocumentStatus.Pending },
        data: { status: KybDocumentStatus.Rejected, reviewedAt: new Date() },
      });
      await this.outbox.emit(tx, {
        aggregate: "merchant",
        aggregateId: merchantId,
        type: "kyb.rejected",
        payload: { merchantId },
      });
    });
  }
}

function toDocumentDto(doc: KybDocument): KybDocumentDto {
  return {
    id: doc.id,
    type: doc.type as KybDocumentType,
    status: doc.status as KybDocumentStatus,
    originalFilename: doc.originalFilename,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    uploadedAt: doc.uploadedAt.toISOString(),
    reviewedAt: doc.reviewedAt?.toISOString() ?? null,
    reviewNote: doc.reviewNote,
  };
}

const DOCUMENT_LABELS: Record<string, string> = {
  BUSINESS_REGISTRATION: "Business registration",
  TAX_ID: "Tax ID",
  DIRECTOR_ID: "Director's ID",
  PROOF_OF_ADDRESS: "Proof of address",
  BANK_STATEMENT: "Bank statement",
  OTHER: "Supporting document",
};

function documentLabel(type: string): string {
  return DOCUMENT_LABELS[type] ?? type;
}
