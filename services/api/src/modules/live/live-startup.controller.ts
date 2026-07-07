import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../security/public.decorator";
import { LiveReadinessService } from "./live-readiness.service";

@Controller("live/health")
export class LiveStartupController {
  constructor(private readonly readiness: LiveReadinessService) {}

  @Get("startup")
  @Public()
  startup() {
    const result = this.readiness.startup();
    if (result.status !== "ready") throw new ServiceUnavailableException(result);
    return result;
  }
}
