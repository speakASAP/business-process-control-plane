import { INSTANCE_EVENT_TYPES, instanceRoutingKey } from '../events/process-event.types';

describe('instance events', () => {
  it('declares the five lifecycle types', () => {
    expect(INSTANCE_EVENT_TYPES).toEqual([
      'instance.started',
      'instance.waiting',
      'instance.resumed',
      'instance.completed',
      'instance.failed',
    ]);
  });

  it('builds versioned routing keys', () => {
    expect(instanceRoutingKey('instance.failed')).toBe('bpcp.instance.failed.v1');
  });

  it('namespaces every type under bpcp with a version suffix', () => {
    for (const type of INSTANCE_EVENT_TYPES) {
      expect(instanceRoutingKey(type)).toMatch(/^bpcp\.instance\.[a-z]+\.v1$/);
    }
  });
});
