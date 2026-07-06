import { Injectable } from "@nestjs/common";

@Injectable()
export class EvidenceService {
  readonly boundary = "evidence-service";
  readonly responsibilities = ["evidence_capture", "hashing", "chain_of_custody", "retention_controls"];
}
