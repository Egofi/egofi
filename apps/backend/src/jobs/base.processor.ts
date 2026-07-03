import { OnWorkerEvent, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";

/**
 * Error handling every worker gets by inheritance, not by discipline: every
 * failed attempt is logged with its job identity and payload, and the final
 * exhausted attempt is flagged loudly as dead-lettered (removeOnFail is
 * false, so the job stays inspectable in Bull Board). A processor that
 * forgets its own try/catch still cannot fail silently.
 */
export abstract class BaseProcessor extends WorkerHost {
  protected readonly log = new Logger(this.constructor.name);

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
    // Worker-level errors (Redis connection loss, etc.) — not tied to a job.
    this.log.error({ err: error }, "worker error");
  }

  @OnWorkerEvent("stalled")
  onStalled(jobId: string): void {
    this.log.warn({ jobId }, "job stalled — worker may have died mid-processing");
  }
}
