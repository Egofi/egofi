import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import pino from "pino";
import { ZodError } from "zod";

const logger = pino({ name: "problem-details" });

// Prisma known-error codes mapped to HTTP semantics out of the box, so no
// endpoint ever leaks a raw engine error or returns a misleading 500.
const PRISMA_ERROR_MAP: Record<string, { status: number; title: string; detail: string }> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    title: "Conflict",
    detail: "A record with this unique value already exists.",
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    title: "Not Found",
    detail: "The requested record does not exist.",
  },
  P2003: {
    status: HttpStatus.CONFLICT,
    title: "Conflict",
    detail: "The operation references a record that does not exist.",
  },
  P2034: {
    status: HttpStatus.CONFLICT,
    title: "Transaction Conflict",
    detail: "The operation conflicted with a concurrent transaction; retry the request.",
  },
};

/**
 * RFC 9457 problem+json error surface (§1) — the single gate every error
 * passes through: HttpExceptions, Prisma engine errors, Zod boundary
 * failures, and unknown throwables all leave the process as a typed problem
 * document carrying the request's correlation id. Registered globally in
 * AppModule; nothing opts in, nothing leaks stack traces.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest & { correlationId?: string }>();

    const correlationId = request.correlationId ?? null;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = "Internal Server Error";
    let detail = "An unexpected error occurred.";
    let extensions: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        detail = body;
      } else if (typeof body === "object" && body !== null) {
        const record = body as Record<string, unknown>;
        detail =
          typeof record["message"] === "string"
            ? (record["message"] as string)
            : Array.isArray(record["message"])
              ? (record["message"] as string[]).join("; ")
              : detail;
        const { message: _m, statusCode: _s, error, ...rest } = record;
        if (typeof error === "string") title = error;
        extensions = rest;
      }
      title = title === "Internal Server Error" ? exception.name : title;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_ERROR_MAP[exception.code];
      if (mapped) {
        ({ status, title, detail } = mapped);
      } else {
        title = "Database Error";
        detail = "The operation could not be completed.";
      }
      logger.warn(
        { code: exception.code, meta: exception.meta, correlationId, url: request.url },
        "prisma known request error",
      );
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      title = "Invalid Query";
      detail = "The request produced an invalid database query.";
      logger.warn({ correlationId, url: request.url }, "prisma validation error");
    } else if (exception instanceof ZodError) {
      // A Zod failure at a boundary we control (webhook payload, provider
      // response) is a contract violation — surface it as 422, log the shape.
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      title = "Validation Failed";
      detail = exception.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      logger.warn(
        { issues: exception.issues, correlationId, url: request.url },
        "zod boundary validation failed",
      );
    } else if (exception instanceof Error) {
      logger.error({ err: exception, correlationId, url: request.url }, "unhandled exception");
    } else {
      logger.error(
        { thrown: exception, correlationId, url: request.url },
        "non-Error throwable reached the exception filter",
      );
    }

    void reply
      .status(status)
      .header("content-type", "application/problem+json")
      .send({
        type: `https://egofi.io/errors/${status}`,
        title,
        status,
        detail,
        instance: request.url,
        correlationId,
        ...extensions,
      });
  }
}
