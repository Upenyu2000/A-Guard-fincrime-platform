import { Injectable } from "@nestjs/common";

@Injectable()
export class WebhookService {
  readonly boundary = "webhook-service";
  readonly responsibilities = ["signed_webhook_receipt", "replay_protection", "retry_tracking", "rate_limits"];
}
