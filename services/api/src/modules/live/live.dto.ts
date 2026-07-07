import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

const integrationTypes = [
  "open_banking",
  "bank_api",
  "visa",
  "mastercard",
  "card_processor",
  "psp",
  "internal_api",
] as const;

const rails = [
  "open_banking",
  "ach",
  "wire",
  "rtp",
  "sepa",
  "visa",
  "mastercard",
  "debit_card",
  "credit_card",
  "psp",
  "internal",
] as const;

export class CursorQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

export class CreateLiveIntegrationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name!: string;

  @IsIn(integrationTypes)
  type!: (typeof integrationTypes)[number];

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  provider!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  adapterId!: string;

  @IsIn(["sandbox", "uat", "production"])
  environment!: "sandbox" | "uat" | "production";

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  authMethods!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  scopes!: string[];

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  credentialReference!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(200)
  credentialFingerprint!: string;

  @IsOptional()
  @IsObject()
  fieldMappings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  webhook?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  rateLimitPerMinute = 1_000;
}

export class CreateLiveApiKeyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  scopes!: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  allowedIps?: string[];
}

export class IngestLiveTransactionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  externalTransactionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  integrationId!: string;

  @IsString()
  @Matches(/^\d+\.\d+$/u)
  @MaxLength(30)
  schemaVersion = "1.0";

  @IsIn(rails)
  rail!: (typeof rails)[number];

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  eventType = "transaction";

  @IsString()
  @Matches(/^\d{1,20}(?:\.\d{1,6})?$/u)
  amount!: string;

  @IsString()
  @Matches(/^[A-Z]{3}$/u)
  currency!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,20}(?:\.\d{1,6})?$/u)
  originalAmount?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/u)
  originalCurrency?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(250)
  customerId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  accountId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  cardId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  merchantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  deviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  beneficiaryId?: string;

  @IsDateString()
  eventAt!: string;

  @IsOptional()
  @IsObject()
  signals?: Record<string, unknown>;
}

export class CreateLiveCaseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  title!: string;

  @IsIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
  priority!: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  @IsOptional()
  @IsString()
  @MaxLength(200)
  alertId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  assigneeSubject?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,20}(?:\.\d{1,6})?$/u)
  lossExposure = "0";

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,20}(?:\.\d{1,6})?$/u)
  recoveryPotential = "0";

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  transactionIds?: string[];
}
