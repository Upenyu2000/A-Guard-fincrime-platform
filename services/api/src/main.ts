import "reflect-metadata";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AppModule } from "./app.module";
import { SafeExceptionFilter } from "./modules/security/safe-exception.filter";

const allowedOrigins = () =>
  (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const isOriginAllowed = (origin?: string) => {
  if (!origin) return true;
  const allowed = allowedOrigins();
  return allowed.includes(origin);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 4000);

  app.use(helmet());
  app.use((request: { headers: Record<string, string | string[] | undefined>; correlationId?: string }, response: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    const header = request.headers["x-correlation-id"];
    const correlationId = (Array.isArray(header) ? header[0] : header) ?? `ag-${randomUUID().slice(0, 12)}`;
    request.correlationId = correlationId;
    response.setHeader("x-correlation-id", correlationId);
    next();
  });
  app.enableCors({
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      callback(isOriginAllowed(origin) ? null : new Error("Origin is not allowed."), isOriginAllowed(origin));
    },
    credentials: true,
  });
  app.setGlobalPrefix("v1");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new SafeExceptionFilter());

  await app.listen(port);
}

void bootstrap();
