import { Injectable } from "@nestjs/common";

@Injectable()
export class ApiKeyService {
  readonly boundary = "api-key-service";
  readonly responsibilities = ["key_generation", "fingerprint_storage", "scope_enforcement", "rotation"];
}
