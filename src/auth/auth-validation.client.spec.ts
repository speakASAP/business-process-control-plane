import { ConfigService } from '@nestjs/config';
import { AuthValidationClient } from './auth-validation.client';

describe('AuthValidationClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    (global as Record<string, unknown>).fetch = originalFetch as unknown;
    jest.restoreAllMocks();
  });

  it('fails closed when AUTH_SERVICE_URL is missing', async () => {
    const client = new AuthValidationClient(config({}));

    await expect(client.validateBearerToken('token-1')).resolves.toBeNull();
    expect(global.fetch).toBe(originalFetch);
  });

  it('uses POST /auth/validate by default and returns identity from successful validation payload', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        valid: true,
        user: { id: 'user-123', email: 'owner@example.com' },
      }),
    }));
    (global as Record<string, unknown>).fetch = fetchMock as unknown;

    const client = new AuthValidationClient(
      config({
        AUTH_SERVICE_URL: 'http://auth-microservice:3370',
      }),
    );

    await expect(client.validateBearerToken('token-1')).resolves.toMatchObject({
      subject: 'user-123',
      actor: 'owner@example.com',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://auth-microservice:3370/auth/validate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'token-1' }),
      }),
    );
  });

  it('returns null when auth service rejects the token', async () => {
    (global as Record<string, unknown>).fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
    })) as unknown;

    const client = new AuthValidationClient(
      config({
        AUTH_SERVICE_URL: 'http://auth-microservice:3370',
      }),
    );

    await expect(client.validateBearerToken('token-1')).resolves.toBeNull();
  });

  it('supports POST validation with explicit path', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ authenticated: true, data: { subject: 'user-xyz', actor: 'reviewer' } }),
    }));
    (global as Record<string, unknown>).fetch = fetchMock as unknown;

    const client = new AuthValidationClient(
      config({
        AUTH_SERVICE_URL: 'http://auth-microservice:3370',
        AUTH_VALIDATION_METHOD: 'POST',
        AUTH_VALIDATION_PATH: '/api/auth/validate-token',
      }),
    );

    await expect(client.validateBearerToken('token-2')).resolves.toMatchObject({
      subject: 'user-xyz',
      actor: 'reviewer',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://auth-microservice:3370/api/auth/validate-token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'token-2' }),
      }),
    );
  });

  function config(values: Record<string, string | undefined>): ConfigService {
    return {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
  }
});
