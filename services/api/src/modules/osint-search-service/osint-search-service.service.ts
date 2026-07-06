import { Injectable } from "@nestjs/common";

@Injectable()
export class OsintSearchService {
  readonly boundary = "osint-search-service";
  readonly responsibilities = ["lawful_basis_enforcement", "permissioned_source_search", "false_positive_safeguards"];
}
