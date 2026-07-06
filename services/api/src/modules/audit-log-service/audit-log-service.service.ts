import { Injectable } from "@nestjs/common";

@Injectable()
export class AuditLogService {
  readonly boundary = "audit-log-service";
  readonly responsibilities = ["immutable_audit_events", "audit_export", "access_review_support"];
}
