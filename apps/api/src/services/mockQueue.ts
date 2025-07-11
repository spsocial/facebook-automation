import { logger } from '../utils/logger';

// Mock queue for development without Redis
export class MockQueue {
  private name: string;
  private processor: Function | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(name: string) {
    this.name = name;
    logger.info(`Mock queue ${name} initialized`);
  }

  async add(jobName: string, data: any, options?: any) {
    logger.info(`Mock queue ${this.name} - Added job ${jobName}`, { data, options });
    const job = {
      id: Math.random().toString(),
      data,
      name: jobName,
    };
    
    // Simulate async processing
    setTimeout(async () => {
      logger.info(`Mock queue ${this.name} - Processing job ${jobName}`, { data });
      if (this.processor) {
        try {
          await this.processor(job);
          this.emit('completed', job);
        } catch (error) {
          logger.error(`Mock queue ${this.name} - Job failed:`, error);
          this.emit('failed', job, error);
        }
      }
    }, 1000);
    
    return job;
  }

  process(processor: Function) {
    this.processor = processor;
    logger.info(`Mock queue ${this.name} - Processor registered`);
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    logger.info(`Mock queue ${this.name} - Event handler registered for ${event}`);
  }

  private emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          logger.error(`Mock queue ${this.name} - Event handler error:`, error);
        }
      });
    }
  }
}