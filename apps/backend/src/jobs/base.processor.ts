import { OnWorkerEvent, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { ErrorThrottle, isTransportError } from "../shared/connection-error";

/**
 * Error handling every worker gets by inheritance, not by discipline: every
 * failed attempt is logged with its job identity and payload, and the final
 * exhausted attempt is flagged loudly as dead-lettered (removeOnFail is
 * false, so the job stays inspectable in Bull Board). A processor that
 * forgets its own try/catch still cannot fail silently.
 */
export abstract class BaseProcessor extends WorkerHost {
  protected readonly log = new Logger(this.constructor.name);
  // Shared across every processor: when Redis goes away it goes away for all of
  // them at once, so one line per window is the whole story.
  private static readonly connectionErrors = new ErrorThrottle();

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error): void {
    const attemptsMade = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts.attempts ?? 1;
    const exhausted = attemptsMade >= maxAttempts;

    const context = {
      queue: job?.queueName,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade,
      maxAttempts,
      data: job?.data as unknown,
      err: error,
    };

    if (exhausted) {
      this.log.error(
        context,
        "job DEAD-LETTERED after exhausting retries — inspect in Bull Board (/admin/queues)",
      );
    } else {
      this.log.warn(context, "job attempt failed; will retry with backoff");
    }
  }

  @OnWorkerEvent("error")
  onWorkerError(error: Error): void {
    // Worker-level errors are not tied to a job. A lost Redis connection raises
    // one per reconnect attempt per worker, which drowns out everything else, so
    // collapse those; anything unexpected is still logged in full.
    if (!isTransportError(error)) {
      this.log.error({ err: error }, "worker error");
      return;
    }
    const report = BaseProcessor.connectionErrors.next();
    if (!report) return;
    this.log.warn(
      { code: error.code, reason: error.message, ...(report.suppressed ? report : {}) },
      "workers lost their Redis connection — retrying",
    );
  }

  @OnWorkerEvent("stalled")
  onStalled(jobId: string): void {
    this.log.warn({ jobId }, "job stalled — worker may have died mid-processing");
  }
}
