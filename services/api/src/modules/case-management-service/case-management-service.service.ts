import { Injectable } from "@nestjs/common";

@Injectable()
export class CaseManagementService {
  readonly boundary = "case-management-service";
  readonly responsibilities = ["case_creation", "timeline_management", "sar_str_drafts", "escalation_workflows"];
}
