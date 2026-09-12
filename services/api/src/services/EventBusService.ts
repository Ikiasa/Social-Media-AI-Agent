import { EventEmitter } from 'events';

export class EventBusService extends EventEmitter {
  private static instance: EventBusService;

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  public static getInstance(): EventBusService {
    if (!EventBusService.instance) {
      EventBusService.instance = new EventBusService();
    }
    return EventBusService.instance;
  }

  public publishEvent(eventName: string, payload: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const eventData = {
      event: eventName,
      timestamp,
      payload,
    };
    this.emit(eventName, eventData);
    this.emit('*', eventData);
  }
}

export const eventBus = EventBusService.getInstance();
