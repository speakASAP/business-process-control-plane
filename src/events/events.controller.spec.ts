import { BadRequestException } from '@nestjs/common';
import { EventsController } from './events.controller';

describe('EventsController', () => {
  let controller: EventsController;
  let eventPublisher: any;

  beforeEach(() => {
    eventPublisher = {
      listEvents: jest.fn(async () => []),
      getOutboxInfo: jest.fn(async () => ({ eventCount: 0 })),
      dispatchPending: jest.fn(async () => ({ attempted: 0 })),
      replayDispatched: jest.fn(async () => ({ attempted: 0 })),
      getTransportInfo: jest.fn(() => ({ readyForDispatch: false })),
    };

    controller = new EventsController(eventPublisher);
  });

  it('parses dispatch limit and forwards it to the publisher', async () => {
    await controller.dispatchOutbox('25');

    expect(eventPublisher.dispatchPending).toHaveBeenCalledWith(25);
  });

  it('rejects malformed dispatch limits before reaching the publisher', async () => {
    await expect(controller.dispatchOutbox('abc')).rejects.toBeInstanceOf(BadRequestException);
    expect(eventPublisher.dispatchPending).not.toHaveBeenCalled();
  });

  it('parses replay limit and forwards filters to the publisher', async () => {
    await controller.replayOutbox('50', 'holiday-discount-2026', 'process.published');

    expect(eventPublisher.replayDispatched).toHaveBeenCalledWith({
      limit: 50,
      processId: 'holiday-discount-2026',
      eventType: 'process.published',
    });
  });

  it('rejects malformed replay limits before reaching the publisher', async () => {
    await expect(controller.replayOutbox('5x')).rejects.toBeInstanceOf(BadRequestException);
    expect(eventPublisher.replayDispatched).not.toHaveBeenCalled();
  });
});
