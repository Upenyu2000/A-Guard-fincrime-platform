import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedPrincipal, AuthenticatedRequest } from "./auth.types";

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new Error("Authenticated principal was not attached to the request.");
    }
    return request.user;
  },
);
