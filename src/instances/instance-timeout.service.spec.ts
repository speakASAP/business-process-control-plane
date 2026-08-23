import { InstanceTimeoutService } from './instance-timeout.service';

const waitingInstance = (onTimeout: 'fail' | 'continue', instanceId = 'i1') => ({
  instanceId,
  wait: { actionId: 'await-approval', signalName: 'approval', waitingSince: 'x', timeoutAt: 'y', onTimeout },
});

describe('InstanceTimeoutService', () => {
  it('fails an expired wait whose onTimeout is fail', async () => {
    const repo = { findExpiredWaits: jest.fn(async () => [waitingInstance('fail')]), failWaitTimeout: jest.fn() };
    const executor = { deliverSignal: jest.fn() };
    const service = new InstanceTimeoutService(repo as never, executor as never);

    const result = await service.sweep(new Date());

    expect(repo.failWaitTimeout).toHaveBeenCalledWith('i1', 'await-approval');
    expect(result).toEqual({ examined: 1, failed: 1, continued: 0 });
  });

  it('resumes an expired wait whose onTimeout is continue', async () => {
    const repo = { findExpiredWaits: jest.fn(async () => [waitingInstance('continue')]), failWaitTimeout: jest.fn() };
    const executor = { deliverSignal: jest.fn() };
    const service = new InstanceTimeoutService(repo as never, executor as never);

    const result = await service.sweep(new Date());

    expect(executor.deliverSignal).toHaveBeenCalledWith('i1', 'approval', { timedOut: true });
    expect(result).toEqual({ examined: 1, failed: 0, continued: 1 });
  });

  it('keeps sweeping after one instance throws, and does not count it as handled', async () => {
    const repo = {
      findExpiredWaits: jest.fn(async () => [waitingInstance('continue', 'i1'), waitingInstance('continue', 'i2')]),
      failWaitTimeout: jest.fn(),
    };
    const executor = {
      deliverSignal: jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined),
    };
    const service = new InstanceTimeoutService(repo as never, executor as never);

    const result = await service.sweep(new Date());

    expect(result.examined).toBe(2);
    expect(result.continued).toBe(1);
  });

  it('reports nothing to do when no waits have expired', async () => {
    const repo = { findExpiredWaits: jest.fn(async () => []), failWaitTimeout: jest.fn() };
    const executor = { deliverSignal: jest.fn() };
    const service = new InstanceTimeoutService(repo as never, executor as never);

    const result = await service.sweep(new Date());

    expect(result).toEqual({ examined: 0, failed: 0, continued: 0 });
    expect(executor.deliverSignal).not.toHaveBeenCalled();
  });

  it('skips an instance with no wait descriptor rather than crashing the sweep', async () => {
    const repo = {
      findExpiredWaits: jest.fn(async () => [{ instanceId: 'i1', wait: null }, waitingInstance('fail', 'i2')]),
      failWaitTimeout: jest.fn(),
    };
    const executor = { deliverSignal: jest.fn() };
    const service = new InstanceTimeoutService(repo as never, executor as never);

    const result = await service.sweep(new Date());

    expect(repo.failWaitTimeout).toHaveBeenCalledWith('i2', 'await-approval');
    expect(result.failed).toBe(1);
  });
});
