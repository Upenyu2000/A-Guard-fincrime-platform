import { Injectable } from "@nestjs/common";

@Injectable()
export class UserAccessService {
  readonly boundary = "user-access-service";
  readonly responsibilities = ["mfa_status", "tenant_isolation", "rbac_scopes", "user_governance"];
}
