import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { AuthenticatedRequest } from "./auth.types";
import { TokenVerifierService } from "./token-verifier.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenVerifier: TokenVerifierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const raw = Array.isArray(authorization) ? authorization[0] : authorization;
    if (!raw?.startsWith("Bearer ")) {
      throw new UnauthorizedException("A bearer access token is required.");
    }

    const token = raw.slice("Bearer ".length).trim();
    if (!token) throw new UnauthorizedException("A bearer access token is required.");

    request.user = await this.tokenVerifier.verifyAccessToken(token);
    return true;
  }
}
