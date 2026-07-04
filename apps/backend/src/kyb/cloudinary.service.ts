import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

export type CloudinaryUpload = {
  publicId: string;
  resourceType: string;
  bytes: number;
  format: string;
};

/**
 * Stores KYB documents as PRIVATE Cloudinary resources (`type: "authenticated"`),
 * so the delivered URL is meaningless without a fresh signature. The backend
 * holds the credentials; merchants never touch Cloudinary directly, and admins
 * view documents only through short-lived signed URLs (§14 PII minimization).
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {
    const cloudName = this.config.get<string>("CLOUDINARY_CLOUD_NAME");
    const apiKey = this.config.get<string>("CLOUDINARY_API_KEY");
    const apiSecret = this.config.get<string>("CLOUDINARY_API_SECRET");

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.configured = true;
    } else {
      this.logger.warn(
        "Cloudinary is not configured — KYB document uploads are disabled until CLOUDINARY_* env vars are set",
      );
    }
  }

  get isConfigured(): boolean {
    return this.configured;
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        "Document storage is not configured. Set the CLOUDINARY_* environment variables.",
      );
    }
  }

  /** Uploads a file buffer as a private resource under a per-merchant folder. */
  async uploadPrivate(
    buffer: Buffer,
    params: { merchantId: string; documentType: string; mimeType: string },
  ): Promise<CloudinaryUpload> {
    this.assertConfigured();

    // PDFs and images both go through the upload API; Cloudinary treats PDFs as
    // "image" resources. Anything else (rare) uploads as "raw".
    const resourceType =
      params.mimeType === "application/pdf" || params.mimeType.startsWith("image/")
        ? "image"
        : "raw";

    return new Promise<CloudinaryUpload>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `egofi/kyb/${params.merchantId}`,
          type: "authenticated", // private — needs a signed URL to view
          resource_type: resourceType,
          use_filename: false,
          unique_filename: true,
          overwrite: false,
          context: { documentType: params.documentType },
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error({ err: error }, "Cloudinary upload failed");
            reject(new ServiceUnavailableException("Document upload failed"));
            return;
          }
          resolve({
            publicId: result.public_id,
            resourceType: result.resource_type,
            bytes: result.bytes,
            format: result.format ?? "",
          });
        },
      );
      stream.end(buffer);
    });
  }

  /** Short-lived signed URL for an operator to view a private document. */
  signedUrl(publicId: string, resourceType: string, ttlSeconds = 300): string {
    this.assertConfigured();
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    return cloudinary.url(publicId, {
      type: "authenticated",
      resource_type: resourceType,
      sign_url: true,
      secure: true,
      expires_at: expiresAt,
    });
  }

  async destroy(publicId: string, resourceType: string): Promise<void> {
    if (!this.configured) return;
    try {
      await cloudinary.uploader.destroy(publicId, {
        type: "authenticated",
        resource_type: resourceType,
      });
    } catch (error) {
      this.logger.warn({ err: error, publicId }, "Cloudinary destroy failed");
    }
  }
}
