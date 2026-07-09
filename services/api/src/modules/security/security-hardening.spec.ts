import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { RbacGuard } from "./rbac.guard";
import { SafeExceptionFilter } from "./safe-exception.filter";
import { DataStoreService } from "../../data-store.service";
import { FraudEngineService } from "../fraud/fraud-engine.service";
import { SecurityService } from "./security.service";

const previousEnv = { ...process.env };

function contextFor(headers: Record<string, string>, roles = ["admin"]) {
  const request: { headers: Record<string, string>; user?: unknown } = { headers };
  return {
    request,
    context: {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as never,
    reflector: {
      getAllAndOverride: () => roles,
    } as never,
  };
}

function jwt(payload: Record<string, unknown>, secret: string) {
  const encodedHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${encodedHeader}.${encodedPayload}`).digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

try {
  process.env.NODE_ENV = "production";
  process.env.ALLOW_DEV_HEADER_AUTH = "false";
  delete process.env.JWT_SECRET;

  {
    const { context, reflector } = contextFor({ "x-role": "admin", "x-actor": "spoofed" }, ["admin"]);
    const guard = new RbacGuard(reflector);
    assert.throws(() => guard.canActivate(context), UnauthorizedException, "production must not trust x-role headers");
  }

  {
    process.env.JWT_SECRET = "ci-placeholder-jwt-secret-value-12345";
    const token = jwt({ sub: "analyst-1", role: "analyst", exp: Math.floor(Date.now() / 1000) + 300 }, process.env.JWT_SECRET);
    const { context, request, reflector } = contextFor({ authorization: `Bearer ${token}` }, ["analyst"]);
    const guard = new RbacGuard(reflector);
    assert.equal(guard.canActivate(context), true);
    assert.deepEqual((request.user as { role: string; authMode: string }).role, "analyst");
    assert.deepEqual((request.user as { role: string; authMode: string }).authMode, "jwt");
  }

  {
    process.env.NODE_ENV = "development";
    process.env.ALLOW_DEV_HEADER_AUTH = "true";
    const { context, request, reflector } = contextFor({ "x-role": "compliance_officer", "x-actor": "local-user" }, ["compliance_officer"]);
    const guard = new RbacGuard(reflector);
    assert.equal(guard.canActivate(context), true);
    assert.deepEqual((request.user as { role: string; authMode: string }).authMode, "local-development");
  }

  {
    process.env.NODE_ENV = "development";
    process.env.ALLOW_DEV_HEADER_AUTH = "true";
    const { context, reflector } = contextFor({ "x-role": "superuser" }, ["admin"]);
    const guard = new RbacGuard(reflector);
    assert.throws(() => guard.canActivate(context), ForbiddenException, "unknown roles must be rejected");
  }

  {
    const filter = new SafeExceptionFilter();
    let body: unknown;
    let statusCode = 0;
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { "x-correlation-id": "ag-test" }, method: "GET", url: "/v1/internal" }),
        getResponse: () => ({
          setHeader: () => undefined,
          status: (status: number) => {
            statusCode = status;
            return {
              json: (payload: unknown) => {
                body = payload;
              },
            };
          },
        }),
      }),
    } as never;
    filter.catch(new NotFoundException("Database table internal_secret_stack was not found."), host);
    assert.equal(statusCode, 404);
    assert.deepEqual(body, { code: "RESOURCE_NOT_FOUND", message: "The requested resource was not found.", correlationId: "ag-test" });
  }

  {
    process.env.CONSORTIUM_SHARED_SECRET = "ci-placeholder-consortium-secret-value";
    const dataStore = new DataStoreService(new SecurityService());
    const picture = dataStore.operatingPicture();
    assert.ok(picture.cases.every((item) => item.sarDraft.startsWith("Restricted SAR content")), "operating picture must not expose SAR drafts");
    assert.ok(dataStore.chat(picture.cases[0]!.id, "Draft SAR").answer.startsWith("Restricted SAR content"), "chat must not expose SAR drafts");
  }

  {
    const decision = new FraudEngineService().scoreEvent({
      event_type: "transaction",
      user_id: "user-test",
      institution_id: "inst-test",
      amount: 25_000,
      signals: { amount_zscore: 4, velocity_5m: 8, graph_risk: 80 },
    });
    assert.equal(decision.explainability.model_version, "AG-RISK-2026.1");
    assert.ok(!decision.reasons.join(" ").includes("ML anomaly"));
  }

  console.log("Security hardening checks passed.");
} finally {
  process.env = previousEnv;
}
