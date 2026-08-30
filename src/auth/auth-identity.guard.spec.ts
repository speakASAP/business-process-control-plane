import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityGuard } from './auth-identity.guard';
import { AuthenticatedRequest } from './auth.types';

describe('AuthIdentityGuard', () => {
  let guard: AuthIdentityGuard;
  let authValidationClient: { validateBearerToken: jest.Mock };

  beforeEach(() => {
    authValidationClient = {
      validateBearerToken: jest.fn(),
    };
    guard = new AuthIdentityGuard(authValidationClient as never);
  });

  it('fails closed when the authorization header is missing', async () => {
    const context = contextFor({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authValidationClient.validateBearerToken).not.toHaveBeenCalled();
  });

  it('fails closed when the bearer token cannot be validated', async () => {
    authValidationClient.validateBearerToken.mockResolvedValue(null);
    const context = contextFor({ authorization: 'Bearer token-1' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('stores the authenticated identity when validation succeeds', async () => {
    authValidationClient.validateBearerToken.mockResolvedValue({
      subject: 'user-123',
      actor: 'user@example.com',
    });

    const context = contextFor({ authorization: 'Bearer token-1' });
    await expect(guard.canActivate(context)).resolves.toBe(true);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    expect(request.authIdentity).toMatchObject({
      subject: 'user-123',
      actor: 'user@example.com',
    });
  });

  function contextFor(headers: Record<string, string>): ExecutionContext {
    const request = { headers } as unknown as AuthenticatedRequest;
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  }
});
