import { NotFoundException } from '@nestjs/common';
import { InstanceController } from './instance.controller';

describe('InstanceController', () => {
  let controller: InstanceController;
  let executor: any;
  let repo: any;

  beforeEach(() => {
    executor = {
      start: jest.fn(async () => ({ instanceId: 'i1', status: 'waiting' })),
      deliverSignal: jest.fn(async () => ({ instanceId: 'i1', status: 'running' })),
    };
    repo = {
      findById: jest.fn(async (id: string) => (id === 'i1' ? { instanceId: 'i1', status: 'waiting' } : null)),
      findSteps: jest.fn(async () => [{ actionId: 'generate', status: 'succeeded' }]),
      list: jest.fn(async () => []),
      cancel: jest.fn(async () => ({ instanceId: 'i1', status: 'cancelled' })),
    };
    controller = new InstanceController(executor, repo);
  });

  it('creates an instance', async () => {
    const body = { workflowId: 'wf', workflowVersion: 1, correlationKey: 'app-1', context: {} };

    await expect(controller.create(body as never)).resolves.toMatchObject({ instanceId: 'i1' });
    expect(executor.start).toHaveBeenCalledWith({
      workflowId: 'wf',
      workflowVersion: 1,
      correlationKey: 'app-1',
      context: {},
    });
  });

  it('defaults context to an empty object when omitted', async () => {
    await controller.create({ workflowId: 'wf', workflowVersion: 1, correlationKey: 'app-1' } as never);

    expect(executor.start).toHaveBeenCalledWith(expect.objectContaining({ context: {} }));
  });

  it('returns 404 for an unknown instance rather than an empty object', async () => {
    await expect(controller.findOne('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the instance when it exists', async () => {
    await expect(controller.findOne('i1')).resolves.toMatchObject({ instanceId: 'i1' });
  });

  it('delivers a signal', async () => {
    await controller.signal('i1', { name: 'approval', payload: { by: 'user' } } as never);

    expect(executor.deliverSignal).toHaveBeenCalledWith('i1', 'approval', { by: 'user' });
  });

  it('defaults a signal payload to an empty object', async () => {
    await controller.signal('i1', { name: 'approval' } as never);

    expect(executor.deliverSignal).toHaveBeenCalledWith('i1', 'approval', {});
  });

  it('returns steps in the audit view', async () => {
    const audit = await controller.audit('i1');

    expect(audit.steps).toHaveLength(1);
    expect(audit.instance).toMatchObject({ instanceId: 'i1' });
  });

  it('404s the audit view for an unknown instance', async () => {
    await expect(controller.audit('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists instances filtered by correlation key', async () => {
    await controller.list('app-1', undefined);

    expect(repo.list).toHaveBeenCalledWith({ correlationKey: 'app-1', status: undefined });
  });

  it('cancels an instance', async () => {
    await expect(controller.cancel('i1')).resolves.toMatchObject({ status: 'cancelled' });
  });
});
