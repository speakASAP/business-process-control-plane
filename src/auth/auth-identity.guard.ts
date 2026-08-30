import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthValidationClient } from './auth-validation.client';
import { AuthenticatedRequest } from './auth.types';

@Injectable()
export class AuthIdentityGuard implements CanActivate {
  constructor(private readonly authValidationClient: AuthValidationClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.readBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Bearer token is required for this endpoint');
    }

    const identity = await this.authValidationClient.validateBearerToken(token);
    if (!identity) {
      throw new UnauthorizedException('Authentication identity could not be confirmed');
    }

    request.authIdentity = identity;
    return true;
  }

  private readBearerToken(header: string | string[] | undefined): string | null {
    if (!header || Array.isArray(header)) {
      return null;
    }

    const [scheme, token, ...rest] = header.trim().split(/\s+/);
    if (rest.length > 0) {
      return null;
    }

    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token;
  }
}
