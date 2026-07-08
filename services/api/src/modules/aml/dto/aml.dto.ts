import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { AmlAlertStatus, AmlDecision, AmlRule, AmlTransactionStatus, ScreeningCheck } from "../aml.types";

const channels = ["mobile_money", "wallet", "bank", "card", "api", "cash_agent", "branch"] as const;
const decisions: AmlDecision[] = ["approve", "approve_monitor", "step_up", "review", "hold", "block", "escalate"];

export class ListAmlTransactionsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDirection?: "asc" | "desc";

  @IsOptional()
  @IsString()
  risk?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  alertStatus?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class EvaluateAmlTransactionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  eventId!: string;

  @IsString()
  institution!: string;

  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  businessId?: string;

  @IsString()
  accountId!: string;

  @IsOptional()
  @IsString()
  walletId?: string;

  @IsString()
  sender!: string;

  @IsString()
  receiver!: string;

  @IsString()
  beneficiary!: string;

  @IsOptional()
  @IsString()
  merchant?: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseCurrencyEquivalent?: number;

  @IsString()
  originCountry!: string;

  @IsString()
  destinationCountry!: string;

  @IsIn(channels)
  channel!: (typeof channels)[number];

  @IsString()
  paymentMethod!: string;

  @IsString()
  deviceId!: string;

  @IsString()
  ipAddress!: string;

  @IsOptional()
  @IsString()
  phoneHash?: string;

  @IsOptional()
  @IsString()
  addressHash?: string;

  @IsOptional()
  @IsString()
  beneficialOwnerId?: string;

  @IsString()
  description!: string;

  @IsIn(["incoming", "outgoing"])
  direction!: "incoming" | "outgoing";

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsIn(["approved", "review", "held", "blocked", "failed", "reversed", "refunded"])
  status?: AmlTransactionStatus;
}

export class BatchEvaluateAmlTransactionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluateAmlTransactionDto)
  transactions!: EvaluateAmlTransactionDto[];
}

export class CreateAmlRuleDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsString()
  category!: AmlRule["category"];

  @IsString()
  field!: string;

  @IsString()
  operator!: AmlRule["operator"];

  @IsString()
  comparisonValue!: string;

  @IsString()
  rollingWindow!: AmlRule["rollingWindow"];

  @IsNumber()
  @Min(0)
  countThreshold!: number;

  @IsNumber()
  @Min(0)
  cumulativeThreshold!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  scoreContribution!: number;

  @IsIn(decisions)
  action!: AmlDecision;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class PatchAmlRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  comparisonValue?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  countThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cumulativeThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  scoreContribution?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AmlActionReasonDto {
  @IsOptional()
  @IsString()
  actor?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AssignAmlAlertDto {
  @IsString()
  analyst!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class PatchAmlAlertDto {
  @IsOptional()
  @IsString()
  assignedAnalyst?: string;

  @IsOptional()
  @IsString()
  status?: AmlAlertStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CloseAmlAlertDto {
  @IsIn(["closed_false_positive", "closed_explained_activity", "closed_with_monitoring", "confirmed_suspicious"])
  status!: Extract<
    AmlAlertStatus,
    "closed_false_positive" | "closed_explained_activity" | "closed_with_monitoring" | "confirmed_suspicious"
  >;

  @IsString()
  reason!: string;
}

export class ScreeningRequestDto {
  @IsString()
  subjectId!: string;

  @IsIn(["customer", "business", "director", "ubo", "counterparty", "device", "ip"])
  subjectType!: ScreeningCheck["subjectType"];

  @IsIn(["sanctions", "pep", "adverse_media", "identity", "company", "ubo", "address", "device", "ip", "source_of_funds"])
  checkType!: ScreeningCheck["checkType"];

  @IsOptional()
  @IsString()
  provider?: string;
}

export class CreateSarDraftDto {
  @IsString()
  caseId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
