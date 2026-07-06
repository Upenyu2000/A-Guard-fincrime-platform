import { Injectable } from "@nestjs/common";

@Injectable()
export class IntegrationsService {
  readonly boundary = "integrations-service";
  readonly responsibilities = [
    "credential_reference_management",
    "connection_testing",
    "schema_mapping",
    "adapter_orchestration",
  ];
}
