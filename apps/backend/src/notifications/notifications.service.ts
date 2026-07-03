import { Injectable, Logger } from "@nestjs/common";

export type NotificationChannel = "email" | "webhook";

export interface Notification {
  merchantId?: string;
  customerId?: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async send(notification: Notification): Promise<void> {
    // Stub — wire up Resend, Postmark, or similar email service here
    this.logger.log(
      { channel: notification.channel, subject: notification.subject },
      "Notification queued",
    );
  }

  async notifyMerchantPaymentReceived(merchantId: string, invoiceId: string) {
    await this.send({
      merchantId,
      channel: "email",
      subject: "Payment received",
      body: `Invoice ${invoiceId} has been paid.`,
      metadata: { invoiceId },
    });
  }

  async notifyMerchantPaymentFailed(merchantId: string, invoiceId: string, reason: string) {
    await this.send({
      merchantId,
      channel: "email",
      subject: "Payment failed",
      body: `Invoice ${invoiceId} failed: ${reason}`,
      metadata: { invoiceId, reason },
    });
  }
}
