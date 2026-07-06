import { Injectable } from "@nestjs/common";

@Injectable()
export class TransactionIngestionService {
  readonly boundary = "transaction-ingestion-service";
  readonly responsibilities = ["queue_ingestion", "idempotency", "schema_normalisation", "dead_letter_routing"];
}
