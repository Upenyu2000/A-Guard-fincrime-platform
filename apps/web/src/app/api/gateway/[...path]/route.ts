import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

const hopByHopHeaders = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "x-role",
  "x-actor",
]);

type GatewayContext = {
  params: Promise<{ path: string[] }>;
};

async function proxy(request: NextRequest, context: GatewayContext) {
  const { path } = await context.params;
  const base = process.env.PUBLIC_API_GATEWAY_URL ?? "http://localhost:4000";
  const upstream = new URL(`/${path.join("/")}${request.nextUrl.search}`, base);
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (!hopByHopHeaders.has(key.toLowerCase())) headers.set(key, value);
  });

  const devAuthEnabled = process.env.ALLOW_DEV_HEADER_AUTH !== "false" && process.env.NODE_ENV !== "production";
  if (devAuthEnabled && !headers.has("authorization")) {
    headers.set("x-role", process.env.DEV_AUTH_ROLE ?? "admin");
    headers.set("x-actor", process.env.DEV_AUTH_ACTOR ?? "local-gateway-user");
  }

  const correlationId = request.headers.get("x-correlation-id") ?? `ag-${randomUUID()}`;
  headers.set("x-correlation-id", correlationId);

  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (!hopByHopHeaders.has(key.toLowerCase())) responseHeaders.set(key, value);
  });
  responseHeaders.set("x-correlation-id", correlationId);

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
