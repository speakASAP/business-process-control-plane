import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedIdentity } from './auth.types';

const DEFAULT_AUTH_VALIDATION_PATH = '/api/auth/validate';
const DEFAULT_AUTH_VALIDATION_TIMEOUT_MS = 3000;
const SUPPORTED_AUTH_VALIDATE_METHODS = ['GET', 'POST'] as const;
type AuthValidateMethod = (typeof SUPPORTED_AUTH_VALIDATE_METHODS)[number];

@Injectable()
export class AuthValidationClient {
  private readonly logger = new Logger(AuthValidationClient.name);

  constructor(private readonly config: ConfigService) {}

  async validateBearerToken(token: string): Promise<AuthenticatedIdentity | null> {
    const endpoint = this.resolveValidationEndpoint();
    if (!endpoint) {
      this.logger.warn('AUTH_SERVICE_URL is not configured; protected endpoints fail closed');
      return null;
    }

    const method = this.validationMethod();
    const timeoutMs = this.validationTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
        },
        body: method === 'POST' ? JSON.stringify({ token }) : undefined,
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        return null;
      }

      if (!response.ok) {
        this.logger.warn(`Auth validation request failed with status ${response.status}`);
        return null;
      }

      const payload = await this.safeJson(response);
      return this.extractIdentity(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Auth validation failed closed: ${message}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private resolveValidationEndpoint(): string | null {
    const baseUrl = this.config.get<string>('AUTH_SERVICE_URL')?.trim();
    if (!baseUrl) {
      return null;
    }

    const path = this.config.get<string>('AUTH_VALIDATION_PATH')?.trim() || DEFAULT_AUTH_VALIDATION_PATH;
    try {
      return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
    } catch {
      this.logger.warn(`Invalid AUTH validation endpoint base/path combination: ${baseUrl} + ${path}`);
      return null;
    }
  }

  private validationMethod(): AuthValidateMethod {
    const method = this.config.get<string>('AUTH_VALIDATION_METHOD')?.trim().toUpperCase();
    if (method === 'POST') {
      return 'POST';
    }
    return 'GET';
  }

  private validationTimeoutMs(): number {
    const parsed = Number.parseInt(this.config.get<string>('AUTH_VALIDATION_TIMEOUT_MS') ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AUTH_VALIDATION_TIMEOUT_MS;
  }

  private async safeJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  private extractIdentity(payload: unknown): AuthenticatedIdentity | null {
    const record = this.toRecord(payload);
    if (!record) {
      return null;
    }

    if (record.valid === false || record.authenticated === false) {
      return null;
    }

    const envelope = this.toRecord(record.data) ?? record;
    const user = this.toRecord(envelope.user);
    const identity = this.toRecord(envelope.identity);

    const subject =
      this.readString(envelope.subject) ??
      this.readString(envelope.sub) ??
      this.readString(envelope.userId) ??
      this.readString(envelope.id) ??
      this.readString(user?.id) ??
      this.readString(user?.userId) ??
      this.readString(identity?.subject) ??
      this.readString(identity?.id);

    if (!subject) {
      return null;
    }

    const actor =
      this.readString(envelope.actor) ??
      this.readString(envelope.username) ??
      this.readString(user?.email) ??
      this.readString(user?.username) ??
      subject;

    return { subject, actor };
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }
}
