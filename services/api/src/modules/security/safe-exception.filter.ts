import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { randomUUID } from "node:crypto";

const safeErrors: Record<number, { code: string; message: string }> = {
  [HttpStatus.BAD_REQUEST]: {
    code: "VALIDATION_ERROR",
    message: "The request could not be processed.",
  },
  [HttpStatus.UNAUTHORIZED]: {
    code: "AUTHENTICATION_REQUIRED",
    message: "Authentication is required.",
  },
  [HttpStatus.FORBIDDEN]: {
    code: "ACCESS_DENIED",
    message: "The authenticated user is not permitted to access this resource.",
  },
  [HttpStatus.NOT_FOUND]: {
    code: "RESOURCE_NOT_FOUND",
    message: "The requested resource was not found.",
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    code: "RATE_LIMITED",
    message: "Too many requests. Try again later.",
  },
};

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      correlationId?: string;
      method?: string;
      url?: string;
    }>();
    const response = ctx.getResponse<{
      status: (status: number) => { json: (body: unknown) => void };
      setHeader?: (name: string, value: string) => void;
    }>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const safe = safeErrors[status] ?? {
      code: "RISK_ENGINE_UNAVAILABLE",
      message: "The transaction assessment service is temporarily unavailable.",
    };
    const correlationId = this.correlationId(request);

    response.setHeader?.("x-correlation-id", correlationId);
    this.logSafe(exception, status, correlationId, request);
    response.status(status).json({ ...safe, correlationId });
  }

  private correlationId(request?: { headers?: Record<string, string | string[] | undefined>; correlationId?: string }) {
    const header = request?.headers?.["x-correlation-id"] ?? request?.headers?.["X-Correlation-Id"];
    const value = Array.isArray(header) ? header[0] : header;
    return request?.correlationId ?? value ?? `ag-${randomUUID().slice(0, 12)}`;
  }

  private logSafe(
    exception: unknown,
    status: number,
    correlationId: string,
    request?: { method?: string; url?: string },
  ) {
    const name = exception instanceof Error ? exception.name : "UnknownError";
    const payload = {
      level: status >= 500 ? "error" : "warn",
      status,
      correlationId,
      method: request?.method,
      path: request?.url?.split("?")[0],
      errorName: name,
      message: status >= 500 ? "Unhandled server exception" : "Handled request exception",
    };
    if (status >= 500) console.error(JSON.stringify(payload));
    else console.warn(JSON.stringify(payload));
  }

}
