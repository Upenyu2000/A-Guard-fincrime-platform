import "reflect-metadata";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

const configuredOrigins = (): string[] =>
  (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

async function bootstrap() {
  const environment = process.env.NODE_ENV ?? "development";
  const allowedOrigins = configuredOrigins();
  if (environment === "production" && allowedOrigins.length === 0) {
    throw new Error("CORS_ALLOWED_ORIGINS must be configured in production.");
  }

  const app = await NestFactory.create(AppModule, { rawBody: true });
  const port = Number(process.env.PORT ?? 4000);

  app.use(
    helmet({
      contentSecurityPolicy: environment === "production" ? undefined : false,
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );
  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS policy."), false);
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "authorization",
      "content-type",
      "idempotency-key",
      "x-request-id",
      "x-webhook-id",
      "x-webhook-signature",
      "x-webhook-timestamp",
    ],
    maxAge: 600,
  });
  app.setGlobalPrefix("v1");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: false,
    }),
  );
  app.enableShutdownHooks();

  await app.listen(port, "0.0.0.0");
}

void bootstrap();
