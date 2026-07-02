import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import * as amqp from 'amqplib';
import {
  ProcessEventDispatchResult,
  ProcessEventEnvelope,
  ProcessEventTransportInfo,
  ProcessEventType,
} from './process-event.types';

const DEFAULT_EXCHANGE = 'bpcp.events';
const DEFAULT_ROUTING_KEY_PREFIX = 'bpcp.process';
const DEFAULT_TIMEOUT_MS = 5000;

@Injectable()
export class RabbitMqProcessEventTransportService {
  private readonly logger = new Logger(RabbitMqProcessEventTransportService.name);

  getTransportInfo(): ProcessEventTransportInfo {
    const config = this.getConfig();
    return {
      schemaVersion: 'bpcp.process-event-transport-info.v1',
      enabled: config.enabled,
      transport: 'rabbitmq-topic',
      exchange: config.exchange,
      routingKeyPrefix: config.routingKeyPrefix,
      urlConfigured: Boolean(config.url),
      signingSecretConfigured: Boolean(config.signingSecret),
      publishTimeoutMs: config.publishTimeoutMs,
      readyForDispatch: config.blockers.length === 0,
      blockers: config.blockers,
      routingKeys: this.routingKeys(config.routingKeyPrefix),
    };
  }

  async dispatch(event: ProcessEventEnvelope): Promise<ProcessEventDispatchResult> {
    const config = this.getConfig();
    const routingKey = this.routingKeyFor(event.type, config.routingKeyPrefix);
    const attemptedAt = new Date().toISOString();

    if (config.blockers.length > 0 || !config.url || !config.signingSecret) {
      return {
        schemaVersion: 'bpcp.process-event-dispatch-result.v1',
        eventId: event.id,
        state: 'skipped',
        transport: 'rabbitmq-topic',
        exchange: config.exchange,
        routingKey,
        attemptedAt,
        blockers: config.blockers,
      };
    }

    let connection: amqp.ChannelModel | undefined;
    let channel: amqp.Channel | undefined;
    try {
      connection = await this.withTimeout(amqp.connect(config.url), config.publishTimeoutMs);
      channel = await this.withTimeout(connection.createChannel(), config.publishTimeoutMs);
      await channel.assertExchange(config.exchange, 'topic', { durable: true });

      const body = Buffer.from(JSON.stringify(event));
      const signature = createHmac('sha256', config.signingSecret).update(body).digest('hex');
      const accepted = channel.publish(config.exchange, routingKey, body, {
        contentType: 'application/json',
        persistent: true,
        headers: {
          eventType: routingKey,
          schemaVersion: event.schemaVersion,
          processId: event.processId,
          version: String(event.version),
          'x-bpcp-signature-algorithm': 'hmac-sha256',
          'x-bpcp-signature': signature,
        },
      });

      if (!accepted) {
        throw new Error('RabbitMQ channel returned backpressure for process event publish');
      }

      return {
        schemaVersion: 'bpcp.process-event-dispatch-result.v1',
        eventId: event.id,
        state: 'dispatched',
        transport: 'rabbitmq-topic',
        exchange: config.exchange,
        routingKey,
        attemptedAt,
        blockers: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`RabbitMQ process event dispatch failed: ${message}`);
      return {
        schemaVersion: 'bpcp.process-event-dispatch-result.v1',
        eventId: event.id,
        state: 'failed',
        transport: 'rabbitmq-topic',
        exchange: config.exchange,
        routingKey,
        attemptedAt,
        error: message,
        blockers: [],
      };
    } finally {
      if (channel) {
        await channel.close().catch(() => undefined);
      }
      if (connection) {
        await connection.close().catch(() => undefined);
      }
    }
  }

  private getConfig() {
    const enabled = process.env.BPCP_EVENT_BUS_ENABLED === 'true';
    const url = this.optionalEnv('BPCP_EVENT_BUS_URL') ?? this.optionalEnv('RABBITMQ_URL');
    const signingSecret = this.optionalEnv('BPCP_PROCESS_SIGNING_SECRET');
    const exchange = this.optionalEnv('BPCP_EVENTS_EXCHANGE') ?? DEFAULT_EXCHANGE;
    const routingKeyPrefix = this.optionalEnv('BPCP_EVENTS_ROUTING_KEY_PREFIX') ?? DEFAULT_ROUTING_KEY_PREFIX;
    const publishTimeoutMs = this.positiveIntEnv('BPCP_EVENT_BUS_PUBLISH_TIMEOUT_MS', DEFAULT_TIMEOUT_MS);
    const blockers: string[] = [];

    if (!enabled) {
      blockers.push('[MISSING: BPCP_EVENT_BUS_ENABLED=true approval for RabbitMQ dispatch]');
    }
    if (!url) {
      blockers.push('[MISSING: BPCP_EVENT_BUS_URL or RABBITMQ_URL]');
    }
    if (!signingSecret) {
      blockers.push('[MISSING: BPCP_PROCESS_SIGNING_SECRET vault-managed secret]');
    }

    return {
      enabled,
      url,
      signingSecret,
      exchange,
      routingKeyPrefix,
      publishTimeoutMs,
      blockers,
    };
  }

  private routingKeys(prefix: string): Record<ProcessEventType, string> {
    return {
      'process.created': `${prefix}.created.v1`,
      'process.validated': `${prefix}.validated.v1`,
      'process.scheduled': `${prefix}.scheduled.v1`,
      'process.published': `${prefix}.published.v1`,
      'process.paused': `${prefix}.paused.v1`,
      'process.retired': `${prefix}.retired.v1`,
    };
  }

  private routingKeyFor(type: ProcessEventType, prefix: string): string {
    return this.routingKeys(prefix)[type];
  }

  private optionalEnv(name: string): string | undefined {
    const value = process.env[name]?.trim();
    if (!value || value.startsWith('[MISSING:')) {
      return undefined;
    }
    return value;
  }

  private positiveIntEnv(name: string, fallback: number): number {
    const value = Number.parseInt(process.env[name] ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeout = setTimeout(() => reject(new Error(`RabbitMQ operation timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
